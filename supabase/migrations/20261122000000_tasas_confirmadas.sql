-- Retiros: no se aprueban con tasas de retencion sin confirmar.
--
-- Las tasas de `tasas_retencion` se sembraron como marcador de posicion y estan
-- marcadas como PROVISIONALES: las debe confirmar un contador antes de dispersar
-- dinero real. Aprobar un retiro calcula ISR e IVA con ellas y genera una
-- transferencia, asi que ahora se niega mientras el ajuste
-- `tasas_retencion_confirmadas` no este en verdadero.
--
-- Es la misma idea que el tipo de cambio: un numero supuesto aqui se convierte
-- en una transferencia real por la cantidad equivocada. Quien confirma es la
-- administradora, con admin_ajustar_bandera, y queda en la bitacora.

insert into public.ajustes (clave, valor) values ('tasas_retencion_confirmadas', 'false'::jsonb)
on conflict (clave) do nothing;

CREATE OR REPLACE FUNCTION public.admin_resolver_retiro(solicitud uuid, aprobar boolean, motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  if not coalesce((select (a.valor)::text::boolean from public.ajustes a
                    where a.clave = 'tasas_retencion_confirmadas'), false) then
    raise exception 'Las tasas de retencion son provisionales: confirmalas con tu contador y marca las tasas como confirmadas antes de aprobar retiros';
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
end; $function$;
