-- Saldo disponible y gasto.
--
-- 1) retiro_disponible restaba tambien las solicitudes 'aprobada', pero el
--    cargo de un retiro se anota en el libro al aprobarlo: esa cantidad ya
--    no esta en el saldo. Se descontaba dos veces hasta que pasaba a 'pagada'.
--    Solo las solicitudes 'pendiente' siguen reservando dinero.
--
-- 2) Comprar, rentar, suscribirse, pagar un encargo y dar propina validaban
--    contra el saldo bruto, asi que se podia gastar dinero que ya estaba
--    pedido en un retiro pendiente. Ahora validan contra el disponible, y el
--    disparador del libro lo exige tambien para cualquier otra via.
--    Un retiro se sigue comprobando contra el saldo completo: su propia
--    solicitud pendiente es la que reserva ese dinero.
--
-- No se tocan 'ajuste_admin' ni 'reembolso': pueden ser negativos a proposito
-- (devolver una venta a una creadora que ya cobro, corregir un error).

create or replace function public.retiro_disponible(uid uuid default auth.uid())
returns bigint language sql stable security definer set search_path = '' as $$
  select public.saldo(uid) - coalesce((
    select sum(s.coins) from public.solicitudes_retiro s
     where s.creator_id = uid and s.estado = 'pendiente'), 0);
$$;

create or replace function public.ledger_no_deja_saldo_negativo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actual bigint; reservado bigint := 0;
begin
  if new.delta >= 0 or new.motivo not in ('compra_clip', 'propina', 'retiro') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || new.user_id::text, 0));
  select coalesce(sum(delta), 0) into actual
    from public.coin_ledger where user_id = new.user_id;
  if new.motivo <> 'retiro' then
    select coalesce(sum(coins), 0) into reservado
      from public.solicitudes_retiro
     where creator_id = new.user_id and estado = 'pendiente';
  end if;
  if actual + new.delta < reservado then
    raise exception 'El saldo ya no alcanza para este movimiento';
  end if;
  return new;
end; $$;

-- ---------- El gasto valida contra el disponible ----------

CREATE OR REPLACE FUNCTION public.comprar_clip(clip uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c        public.clips;
  yo       uuid := auth.uid();
  mi_saldo int;
  para_ella int;
  comision int;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
  if yo is null then
    raise exception 'Necesitas entrar para comprar' using errcode = 'insufficient_privilege';
  end if;

  select * into c from public.clips where id = clip;
  if c.id is null then raise exception 'Ese clip no existe'; end if;
  if not c.published then raise exception 'Ese clip no está publicado'; end if;
  if c.creator_id = yo then raise exception 'Es tuyo, no necesitas comprarlo'; end if;
  if c.visibility <> 'pago' then raise exception 'Ese clip no se vende por separado'; end if;

  if exists (select 1 from public.purchases where user_id = yo and clip_id = clip) then
    raise exception 'Ya lo tienes desbloqueado';
  end if;
  if c.caduca_at is not null and c.caduca_at <= now() then
    raise exception 'Ese clip ya no esta disponible: la creadora le puso fecha de retiro';
  end if;


  mi_saldo := public.retiro_disponible(yo);
  if mi_saldo < c.price_coins then
    raise exception 'Te faltan % coins', c.price_coins - mi_saldo;
  end if;

  -- La comision sale de public.ajustes, no de un numero escrito aqui.
  comision := public.comision_de(c.price_coins);
  para_ella := c.price_coins - comision;

  insert into public.purchases (user_id, clip_id, price_coins)
  values (yo, clip, c.price_coins);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -c.price_coins, 'compra_clip', clip, yo, c.title),
         (c.creator_id, para_ella, 'venta_clip', clip, yo, c.title);

  return jsonb_build_object(
    'ok', true,
    'saldo', public.saldo(yo),
    'pagaste', c.price_coins,
    'recibio', para_ella
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.rentar_clip(clip uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); c record; mi_saldo bigint; comision int; para_ella int;
        vence_en timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
  if yo is null then
    raise exception 'Hay que entrar' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.clips where id = clip;
  if c is null or c.borrado_at is not null then raise exception 'Ese clip no existe'; end if;
  if not c.published then raise exception 'Ese clip no esta publicado'; end if;
  if c.creator_id = yo then raise exception 'Es tuyo, no necesitas rentarlo'; end if;
  if c.caduca_at is not null and c.caduca_at <= now() then
    raise exception 'Ese clip ya no esta disponible: la creadora le puso fecha de retiro';
  end if;
  if c.renta_coins is null or c.renta_horas is null then
    raise exception 'Ese clip no se renta';
  end if;

  -- Quien ya lo compro no puede rentarlo: seria cobrarle por algo que ya
  -- tiene para siempre.
  if exists (select 1 from public.purchases p where p.clip_id = clip and p.user_id = yo) then
    raise exception 'Ya lo compraste, es tuyo para siempre';
  end if;
  -- Ni renovar sobre una renta viva: se avisa cuando vence en vez de cobrar
  -- dos veces por el mismo periodo.
  select r.vence into vence_en from public.rentals r
   where r.clip_id = clip and r.user_id = yo and r.vence > now()
   order by r.vence desc limit 1;
  if vence_en is not null then
    raise exception 'Tu renta sigue viva hasta el %', to_char(vence_en, 'DD/MM HH24:MI');
  end if;

  mi_saldo := public.retiro_disponible(yo);
  if mi_saldo < c.renta_coins then
    raise exception 'Te faltan % coins', c.renta_coins - mi_saldo;
  end if;

  comision  := public.comision_de(c.renta_coins);
  para_ella := c.renta_coins - comision;
  vence_en  := now() + (c.renta_horas || ' hours')::interval;

  insert into public.rentals (user_id, clip_id, price_coins, inicio, vence)
  values (yo, clip, c.renta_coins, now(), vence_en);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -c.renta_coins, 'compra_clip', clip, yo, 'Renta: ' || c.title),
         (c.creator_id, para_ella, 'venta_clip', clip, yo, 'Renta: ' || c.title);

  return jsonb_build_object('ok', true, 'vence', vence_en, 'saldo', public.saldo(yo));
end; $function$;

CREATE OR REPLACE FUNCTION public.suscribirse(nivel uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); t record; mi_saldo bigint; comision int; para_ella int;
        fin timestamptz; hasta timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  select * into t from public.subscription_tiers where id = nivel and activo;
  if t is null then raise exception 'Ese nivel no existe o ya no esta activo'; end if;
  if t.creator_id = yo then raise exception 'No puedes suscribirte a ti misma'; end if;
  if coalesce(t.precio_coins, 0) <= 0 then
    raise exception 'Ese nivel todavia no tiene precio en coins';
  end if;

  -- Un valor escalar, no un record: aqui no hay ambiguedad posible.
  select s.periodo_fin into hasta from public.subscriptions s
   where s.creator_id = t.creator_id and s.subscriber_id = yo
     and s.estado = 'activa' and s.periodo_fin > now();
  if hasta is not null then
    raise exception 'Ya estas suscrita hasta el %', to_char(hasta, 'DD/MM/YYYY');
  end if;

  mi_saldo := public.retiro_disponible(yo);
  if mi_saldo < t.precio_coins then
    raise exception 'Te faltan % coins', t.precio_coins - mi_saldo;
  end if;

  comision  := public.comision_de(t.precio_coins);
  para_ella := t.precio_coins - comision;
  fin := now() + interval '30 days';

  insert into public.subscriptions
    (subscriber_id, creator_id, tier_id, estado, inicio, periodo_fin, proveedor)
  values (yo, t.creator_id, nivel, 'activa', now(), fin, 'coins')
  on conflict (subscriber_id, creator_id) do update
    set tier_id = excluded.tier_id, estado = 'activa',
        inicio = excluded.inicio, periodo_fin = excluded.periodo_fin,
        cancela_al_fin = false, updated_at = now();

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -t.precio_coins, 'compra_clip', nivel, yo, 'Suscripcion: ' || t.nombre),
         (t.creator_id, para_ella, 'venta_clip', nivel, yo, 'Suscripcion: ' || t.nombre);

  return jsonb_build_object('ok', true, 'hasta', fin);
end; $function$;

CREATE OR REPLACE FUNCTION public.dar_propina(para uuid, cantidad integer, texto text DEFAULT NULL::text, ctx contexto_propina DEFAULT 'perfil'::contexto_propina, referencia uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  yo uuid := auth.uid();
  mi_saldo int;
  comision int;
  neto int;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;
  if para = yo then raise exception 'No puedes darte propina a ti misma'; end if;
  if cantidad <= 0 then raise exception 'La propina debe ser mayor a cero'; end if;

  mi_saldo := public.retiro_disponible(yo);
  if mi_saldo < cantidad then
    raise exception 'Te faltan % coins', cantidad - mi_saldo;
  end if;

  comision := public.comision_de(cantidad);
  neto     := cantidad - comision;

  insert into public.tips (de_id, para_id, coins, mensaje, contexto, ref_id)
  values (yo, para, cantidad, texto, ctx, referencia);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo,  -cantidad, 'propina', referencia, yo, texto),
         (para, neto,     'propina', referencia, yo, texto);

  return jsonb_build_object('ok', true, 'saldo', public.saldo(yo), 'recibio', neto);
end;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_encargo(encargo uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); e record; precio int;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
  select * into e from public.custom_requests where id = encargo for update;
  if e is null then raise exception 'Ese encargo no existe'; end if;
  if e.fan_id <> yo then
    raise exception 'Solo quien lo encargo puede pagarlo' using errcode='insufficient_privilege';
  end if;
  if e.estado <> 'aceptado' then raise exception 'Ese encargo no esta aceptado todavia'; end if;

  precio := coalesce(e.acordado_coins, e.oferta_coins);
  if public.retiro_disponible(yo) < precio then
    raise exception 'Te faltan % coins', precio - public.retiro_disponible(yo);
  end if;

  -- Solo el cargo. A la creadora NO se le abona aqui: el dinero queda
  -- retenido por la plataforma hasta que entregue. Es lo unico que hace
  -- posible reembolsar si no cumple.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -precio, 'compra_clip', encargo, yo, 'Encargo pagado');

  update public.custom_requests set estado = 'pagado', updated_at = now() where id = encargo;
  return jsonb_build_object('ok', true, 'retenido', precio);
end; $function$;
