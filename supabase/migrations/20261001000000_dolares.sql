-- La economia interna pasa de "coins" a DOLARES.
--
-- QUE CAMBIA Y QUE NO. El valor guardado sigue siendo el mismo entero y las
-- columnas conservan su nombre (price_coins y compañia). Lo que cambia es que
-- ese entero YA NO es una ficha inventada sino CENTAVOS DE DOLAR: lo que valia
-- 240 coins vale 2.40 USD. La equivalencia es 1 a 1, asi que ningun precio se
-- mueve y ninguna cuenta cambia de resultado.
--
-- POR QUE NO SE RENOMBRAN LAS COLUMNAS AHORA. Son diez columnas repartidas en
-- veintiun archivos de migracion y mas de cuarenta funciones, todas de dinero.
-- Renombrarlas en el mismo paso que se cambia su significado mezcla dos
-- cambios de riesgo distinto: si algo saliera mal no se sabria cual de los dos
-- fue. Se hace despues, en su propia migracion, con las pruebas delante. Hasta
-- entonces cada columna dice su unidad en su comentario.
--
-- LA CONVERSION NO DESAPARECE, SE MUEVE. A la creadora se le paga en pesos por
-- SPEI y el SAT retiene sobre pesos. Antes hacia falta valor_coin_mxn, un
-- numero que nadie habia definido porque no existe un mercado de coins. Ahora
-- hace falta el tipo de cambio dolar-peso, que SI es un numero real y
-- comprobable. Se gana en honestidad: se deja de inventar una cifra.

comment on column public.clips.price_coins is
  'Precio de compra permanente, en CENTAVOS DE DOLAR. 240 = 2.40 USD.';
comment on column public.clips.renta_coins is
  'Precio de la renta, en CENTAVOS DE DOLAR.';
comment on column public.subscription_tiers.precio_coins is
  'Precio mensual del nivel, en CENTAVOS DE DOLAR.';
comment on column public.coin_ledger.delta is
  'Movimiento en CENTAVOS DE DOLAR. Positivo entra, negativo sale.';
comment on column public.custom_requests.oferta_coins is
  'Oferta inicial del encargo, en CENTAVOS DE DOLAR.';
comment on column public.custom_requests.acordado_coins is
  'Precio acordado del encargo, en CENTAVOS DE DOLAR.';
comment on column public.solicitudes_retiro.coins is
  'Lo que se pide retirar, en CENTAVOS DE DOLAR. Se convierte a pesos al aprobar.';

-- ---------- El tipo de cambio, ahora real ----------

insert into public.ajustes (clave, valor, nota) values
  ('tipo_cambio_usd_mxn', 'null'::jsonb,
   'Cuantos CENTAVOS DE PESO vale un dolar. Ejemplo: 1850 = 18.50 MXN por USD. Sin esto no se puede aprobar un retiro, porque no hay forma de saber cuantos pesos transferir. A diferencia del viejo valor_coin_mxn, este es un numero real que se puede consultar en cualquier lado.')
on conflict (clave) do nothing;

update public.ajustes
   set nota = 'OBSOLETO. Lo sustituye tipo_cambio_usd_mxn desde que la economia interna se cuenta en dolares.'
 where clave = 'valor_coin_mxn';

update public.ajustes
   set nota = 'Minimo para solicitar un retiro, en CENTAVOS DE DOLAR. 500 = 5 USD. Existe porque cada SPEI cuesta comision fija y dispersar cantidades minusculas se come el pago.'
 where clave = 'retiro_minimo_coins';

create or replace function public.tipo_cambio_usd_mxn()
returns int language sql stable security definer set search_path = '' as $$
  select nullif((select valor from public.ajustes where clave='tipo_cambio_usd_mxn'),
                'null'::jsonb)::text::int;
$$;

-- ---------- El retiro convierte dolares a pesos ----------

create or replace function public.admin_resolver_retiro(
  solicitud uuid, aprobar boolean, motivo text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; cambio int; bruto int; t record; isr int; iva int; neto int; disp uuid;
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

  isr := round(bruto * coalesce(t.isr_pct, 0) / 100.0);
  iva := round(bruto * coalesce(t.iva_ret_pct, 0) / 100.0);
  neto := bruto - isr - iva;

  insert into public.payouts (creator_id, periodo_ini, periodo_fin, bruto_mxn,
                              isr_mxn, iva_ret_mxn, neto_mxn,
                              isr_pct_aplicado, iva_ret_pct_aplicado, estado)
  values (s.creator_id, s.created_at::date, current_date, bruto,
          isr, iva, neto, coalesce(t.isr_pct,0), coalesce(t.iva_ret_pct,0), 'programada')
  returning id into disp;

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (s.creator_id, -s.coins, 'ajuste_admin', solicitud, auth.uid(), 'Retiro aprobado');

  update public.solicitudes_retiro
     set estado = 'aprobada', payout_id = disp,
         resuelta_por = auth.uid(), resuelta_at = now()
   where id = solicitud;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'aprobar_retiro', s.creator_id,
          jsonb_build_object('solicitud', solicitud, 'usd_centavos', s.coins,
                             'tipo_cambio', cambio, 'bruto_mxn', bruto,
                             'isr_mxn', isr, 'iva_ret_mxn', iva, 'neto_mxn', neto));

  return jsonb_build_object('ok', true, 'estado', 'aprobada', 'payout', disp,
                            'bruto_mxn', bruto, 'neto_mxn', neto);
end; $$;
revoke all on function public.admin_resolver_retiro(uuid, boolean, text) from public, anon;
revoke all on function public.tipo_cambio_usd_mxn() from public, anon;
grant execute on function public.admin_resolver_retiro(uuid, boolean, text) to authenticated;
grant execute on function public.tipo_cambio_usd_mxn() to authenticated;
