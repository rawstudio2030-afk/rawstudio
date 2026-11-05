-- La retencion de IVA se estaba calculando sobre la base, no sobre el IVA.
--
-- ---------- El fallo ----------
--
-- `admin_resolver_retiro` hacia:
--
--     iva := round(bruto * t.iva_ret_pct / 100.0);
--
-- con `iva_ret_pct` = 50 para persona fisica. Eso retiene la MITAD del bruto.
-- Pero la regla del SAT para plataformas no es "el 50% de lo que le pagas":
-- es el 50% **del IVA trasladado**, y el IVA trasladado es el 16% de la base.
-- El 50% del IVA son 8 puntos de la base, no 50. Se estaba reteniendo unas
-- seis veces de mas.
--
-- Con las tasas sembradas y un retiro de 20 dolares a 18.50:
--
--     bruto 370.00 MXN
--     persona_fisica   ISR   7.77   IVA 185.00  ->  neto   177.23   (48%)
--     sin_registro     ISR  74.00   IVA 370.00  ->  neto   -74.00   NEGATIVO
--
-- Y como `payouts` tiene `check (neto_mxn >= 0)`, el caso `sin_registro` no
-- daba un numero malo: reventaba con un error de restriccion al aprobar. O
-- sea que ninguna creadora sin RFC podia cobrar, y las que si tenian RFC
-- habrian recibido la mitad. Descubierto el 4 de noviembre de 2026, antes de
-- que se aprobara ningun retiro: no hay nada que corregir hacia atras
-- —`solicitudes_retiro` y `payouts` estan vacias—.
--
-- ---------- El arreglo ----------
--
--     iva_trasladado := round(bruto * IVA_PCT / 100.0);
--     iva            := round(iva_trasladado * t.iva_ret_pct / 100.0);
--
-- Queda:
--
--     persona_fisica   ISR   7.77   IVA  29.60  ->  neto  332.63   (90%)
--     sin_registro     ISR  74.00   IVA  59.20  ->  neto  236.80   (64%)
--
-- ---------- Lo que esto NO resuelve, y hay que decirlo ----------
--
-- 1. **Las tasas siguen siendo provisionales.** `tasas_retencion` esta marcada
--    asi desde que se sembro y la confirma un contador, no este archivo. Lo
--    que se arregla aqui es la FORMULA, que estaba mal con cualquier tasa.
--
-- 2. **Se asume que `bruto` es la base, con el IVA por encima.** Si lo que se
--    le paga a la creadora ya llevara el IVA incluido, la base seria
--    bruto / 1.16 y los dos numeros cambian. Esa es una pregunta de contador
--    y no de programador, asi que la asuncion se deja escrita aqui en vez de
--    enterrada en una expresion.
--
-- 3. **El 16% esta escrito a mano.** No va a `ajustes` a proposito: que
--    cambie la tasa general de IVA es un hecho legislativo, y entonces hay
--    que revisar todo esto, no solo un numero en una tabla.
--
-- Y se agrega una guarda: si el neto saliera cero o negativo con alguna
-- combinacion futura de tasas, se niega con un mensaje que se entiende, en
-- vez de chocar contra el `check` de la tabla.

create or replace function public.admin_resolver_retiro(
  solicitud uuid, aprobar boolean, motivo text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s record; cambio int; bruto int; t record;
  iva_trasladado int; isr int; iva int; neto int; disp uuid;
  -- Tasa general de IVA en Mexico. Ver la nota 3 de la cabecera.
  IVA_PCT constant numeric := 16;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver retiros'
      using errcode = 'insufficient_privilege';
  end if;
  select * into s from public.solicitudes_retiro where id = solicitud;
  if s is null then raise exception 'Esa solicitud no existe'; end if;
  if s.estado <> 'pendiente' then
    raise exception 'Esa solicitud ya estaba %', s.estado;
  end if;

  if not aprobar then
    if coalesce(trim(motivo),'') = '' then
      raise exception 'Rechazar un retiro necesita motivo: se le comunica a la creadora';
    end if;
    update public.solicitudes_retiro
       set estado = 'rechazada', motivo_rechazo = motivo,
           resuelta_por = auth.uid(), resuelta_at = now()
     where id = solicitud;
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'rechazar_retiro', s.creator_id,
            jsonb_build_object('solicitud', solicitud, 'motivo', motivo));
    return jsonb_build_object('ok', true, 'estado', 'rechazada');
  end if;

  cambio := public.tipo_cambio_usd_mxn();
  if cambio is null then
    raise exception 'Falta definir el tipo de cambio dolar-peso antes de aprobar retiros';
  end if;

  -- s.coins son centavos de dolar; cambio son centavos de peso por dolar.
  -- El producto queda en centavos de peso por cien, asi que se divide.
  bruto := round(s.coins::numeric * cambio / 100.0);

  select * into t from public.tasas_retencion
   where regimen = coalesce(s.regimen, 'sin_registro') and vigente_desde <= current_date
   order by vigente_desde desc limit 1;

  -- ISR: porcentaje de la base. Eso siempre estuvo bien.
  isr := round(bruto * coalesce(t.isr_pct, 0) / 100.0);

  -- IVA: porcentaje DEL IVA TRASLADADO, no de la base. Este era el fallo.
  iva_trasladado := round(bruto * IVA_PCT / 100.0);
  iva := round(iva_trasladado * coalesce(t.iva_ret_pct, 0) / 100.0);

  neto := bruto - isr - iva;
  if neto <= 0 then
    raise exception
      'Con las tasas vigentes para el regimen % no queda nada que pagar (bruto %, ISR %, IVA %). Revisa tasas_retencion antes de aprobar.',
      coalesce(s.regimen::text, 'sin_registro'), bruto, isr, iva;
  end if;

  insert into public.payouts (creator_id, periodo_ini, periodo_fin, bruto_mxn,
                              isr_mxn, iva_ret_mxn, neto_mxn,
                              isr_pct_aplicado, iva_ret_pct_aplicado, estado)
  values (s.creator_id, s.created_at::date, current_date, bruto,
          isr, iva, neto, coalesce(t.isr_pct,0), coalesce(t.iva_ret_pct,0), 'programada')
  returning id into disp;

  -- El cargo va DESPUES de crear la dispersion: si algo fallara antes, no
  -- quedaria saldo descontado sin ningun pago que lo explique.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (s.creator_id, -s.coins, 'retiro', solicitud, auth.uid(), 'Retiro aprobado');

  update public.solicitudes_retiro
     set estado = 'aprobada', payout_id = disp,
         resuelta_por = auth.uid(), resuelta_at = now()
   where id = solicitud;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'aprobar_retiro', s.creator_id,
          jsonb_build_object('solicitud', solicitud, 'usd_centavos', s.coins,
                             'tipo_cambio', cambio, 'bruto_mxn', bruto,
                             'iva_trasladado_mxn', iva_trasladado,
                             'isr_mxn', isr, 'iva_ret_mxn', iva, 'neto_mxn', neto));

  return jsonb_build_object('ok', true, 'estado', 'aprobada', 'payout', disp,
                            'bruto_mxn', bruto, 'neto_mxn', neto);
end; $$;

revoke all on function public.admin_resolver_retiro(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolver_retiro(uuid, boolean, text) to authenticated;

comment on table public.tasas_retencion is
  'Tasas de retencion por regimen fiscal. PROVISIONALES: las confirma un contador. `iva_ret_pct` es el porcentaje DEL IVA TRASLADADO (50 = la mitad del 16%), no de la base: aplicarlo a la base retiene seis veces de mas, que es el fallo que corrigio 20261107000000.';
