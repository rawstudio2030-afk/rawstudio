-- Segunda parte: usar el motivo nuevo, y corregir lo ya anotado.
--
-- La funcion es la misma de 20261001000000 (la que convierte dolares a pesos);
-- lo unico que cambia es el motivo del asiento.

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
                             'isr_mxn', isr, 'iva_ret_mxn', iva, 'neto_mxn', neto));

  return jsonb_build_object('ok', true, 'estado', 'aprobada', 'payout', disp,
                            'bruto_mxn', bruto, 'neto_mxn', neto);
end; $$;

revoke all on function public.admin_resolver_retiro(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolver_retiro(uuid, boolean, text) to authenticated;

-- ---------- Lo ya anotado ----------
--
-- Se reconoce por el ref_id: solo los retiros apuntan a una solicitud. Los
-- ajustes de verdad los escribe admin_ajustar_saldo, que no pasa ref_id y lo
-- deja nulo, asi que no hay forma de confundirlos.
--
-- El disparador de verificacion del libro es `before insert`, no `before
-- update`, asi que esto no lo despierta.
update public.coin_ledger
   set motivo = 'retiro'
 where motivo = 'ajuste_admin'
   and ref_id in (select id from public.solicitudes_retiro);
