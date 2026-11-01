-- Lo que la creadora necesita saber ANTES de pedir un retiro.
--
-- Hoy no puede saber nada: el minimo vive en `public.ajustes`, que solo lee
-- quien administra, y «cuanto tengo disponible» no es el saldo —lo ya
-- solicitado y sin resolver cuenta como comprometido— sino una resta que solo
-- existia dentro de `solicitar_retiro`. Resultado: la unica forma de enterarse
-- era pedir una cantidad y que la rechazaran.

-- ---------- Una sola definicion de «disponible» ----------
--
-- Estaba escrita dentro de solicitar_retiro. Si la pantalla la copiara, las
-- dos tendrian que cambiar a la vez para siempre, y el dia que se separen la
-- pantalla ofrecera una cantidad que la funcion rechaza. Se extrae y las dos
-- la usan.
create or replace function public.retiro_disponible(uid uuid default auth.uid())
returns bigint language sql stable security definer set search_path = '' as $$
  select public.saldo(uid) - coalesce((
    select sum(s.coins) from public.solicitudes_retiro s
     where s.creator_id = uid and s.estado in ('pendiente','aprobada')), 0);
$$;

revoke all on function public.retiro_disponible(uuid) from public, anon;
grant execute on function public.retiro_disponible(uuid) to authenticated;

-- ---------- Todo lo que la pantalla necesita, de una ----------
create or replace function public.retiro_info()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'Hay que entrar' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'minimo',       coalesce((select (valor)::text::int from public.ajustes
                               where clave = 'retiro_minimo_coins'), 500),
    -- Nunca negativo: si alguna vez lo comprometido supera al saldo, enseñar
    -- un disponible en rojo no ayuda a nadie.
    'disponible',   greatest(public.retiro_disponible(yo), 0),
    'tiene_cuenta', exists (select 1 from public.payout_accounts where user_id = yo),
    'puede_cobrar', public.puede_cobrar(yo)
  );
end; $$;

revoke all on function public.retiro_info() from public, anon;
grant execute on function public.retiro_info() to authenticated;

-- ---------- Y que solicitar_retiro use la misma resta ----------
-- Identica a 20261004000002 salvo que el disponible sale de la funcion.
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

  disponible := public.retiro_disponible(yo);
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
