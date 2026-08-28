-- Ni se compra ni se renta lo que ya caduco.
--
-- La comprobacion va en las funciones de cobro y no solo en la interfaz: sin
-- esto se podria pagar por algo que la creadora ya retiro, y ese cobro habria
-- que devolverlo.


create or replace function public.comprar_clip(clip uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c        public.clips;
  yo       uuid := auth.uid();
  mi_saldo int;
  para_ella int;
  comision int;
begin
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


  mi_saldo := public.saldo(yo);
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
$$;

create or replace function public.rentar_clip(clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); c record; mi_saldo bigint; comision int; para_ella int;
        vence_en timestamptz;
begin
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

  mi_saldo := public.saldo(yo);
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
end; $$;
