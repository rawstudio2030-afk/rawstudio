-- Los avisos del retiro seguian hablando en «coins».
--
-- `solicitar_retiro` se escribio cuando la economia interna eran fichas y la
-- migracion a dolares (20261001000000) no la toco. Los dos mensajes que ve la
-- creadora decian la cifra en crudo y la llamaban coins:
--
--   «El minimo para retirar son 500 coins»     cuando son 5 dolares
--   «Solo tienes 1240 coins disponibles»        cuando son 12.40
--
-- El valor guardado SI es correcto —centavos de dolar, como todo lo demas—;
-- lo que estaba mal era como se contaba. Un mensaje que multiplica por cien
-- lo que la persona tiene es de los peores sitios donde dejar una mentira.
--
-- Nada mas cambian los dos textos. La logica es identica.

create or replace function public.solicitar_retiro(cantidad int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); cta record; minimo int; disponible bigint; nueva uuid;
begin
  if yo is null then
    raise exception 'Hay que entrar' using errcode = 'insufficient_privilege';
  end if;
  if not public.puede_cobrar(yo) then
    raise exception 'Necesitas verificar tu identidad antes de poder retirar';
  end if;

  minimo := coalesce((select (valor)::text::int from public.ajustes
                       where clave='retiro_minimo_coins'), 500);
  if cantidad < minimo then
    raise exception 'El mínimo para retirar son $%', to_char(minimo / 100.0, 'FM999990.00');
  end if;

  -- Lo ya solicitado y sin resolver cuenta como comprometido: si no, se
  -- podria pedir tres veces el mismo saldo y aprobar las tres.
  disponible := public.saldo(yo) - coalesce((
    select sum(s.coins) from public.solicitudes_retiro s
     where s.creator_id = yo and s.estado in ('pendiente','aprobada')), 0);
  if cantidad > disponible then
    raise exception 'Solo tienes $% disponibles (el resto ya está en otra solicitud)',
      to_char(disponible / 100.0, 'FM999990.00');
  end if;

  select * into cta from public.payout_accounts where user_id = yo;
  if cta is null then
    raise exception 'Primero registra tu cuenta para recibir el pago';
  end if;

  insert into public.solicitudes_retiro
    (creator_id, coins, clabe, banco, titular, rfc, regimen, ip)
  values (yo, cantidad, cta.clabe, cta.banco, cta.titular, cta.rfc, cta.regimen,
          public.ip_solicitante())
  returning id into nueva;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (yo, 'solicitar_retiro', yo,
          jsonb_build_object('solicitud', nueva, 'coins', cantidad));
  return jsonb_build_object('ok', true, 'solicitud', nueva);
end; $$;

revoke all on function public.solicitar_retiro(int) from public, anon;
grant execute on function public.solicitar_retiro(int) to authenticated;
