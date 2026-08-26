-- Renta por tiempo y suscripcion mensual.
--
-- Las tablas rentals y subscriptions existian desde el principio, y
-- tiene_acceso() ya las consultaba: una renta vigente o una suscripcion activa
-- abren el clip. Lo que faltaba era la funcion que las CREA. El acceso estaba
-- resuelto y el cobro no, asi que ninguna de las dos podia usarse nunca.

-- ---------- Renta ----------

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
revoke all on function public.rentar_clip(uuid) from public, anon;
grant execute on function public.rentar_clip(uuid) to authenticated;

-- ---------- Suscripcion ----------

-- Los niveles se definieron con precio_mxn, pero la economia interna corre en
-- coins y no hay tipo de cambio. Se agrega precio_coins como el campo que
-- manda; precio_mxn se queda para cuando exista el cobro con tarjeta.
alter table public.subscription_tiers
  add column if not exists precio_coins int check (precio_coins > 0);

comment on column public.subscription_tiers.precio_coins is
  'Lo que se cobra de verdad hoy. precio_mxn queda para cuando exista el procesador de pagos y se pueda cobrar con tarjeta de forma recurrente.';

create or replace function public.crear_nivel(
  p_nombre text, p_precio_coins int, p_descripcion text default null, p_orden int default 0
) returns uuid language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); nuevo uuid;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  if not public.puede_cobrar(yo) then
    raise exception 'Verifica tu identidad antes de cobrar suscripciones';
  end if;
  if p_precio_coins <= 0 then raise exception 'El precio debe ser mayor que cero'; end if;

  insert into public.subscription_tiers
    (creator_id, nombre, descripcion, precio_mxn, precio_coins, orden)
  -- precio_mxn es not null desde el diseño original; hasta que exista el
  -- tipo de cambio se guarda el mismo numero, y el que se cobra es el otro.
  values (yo, p_nombre, p_descripcion, greatest(1, p_precio_coins), p_precio_coins, p_orden)
  returning id into nuevo;
  return nuevo;
end; $$;

create or replace function public.borrar_nivel(nivel uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- No se borra: se desactiva. Borrarlo dejaria huerfanas las suscripciones
  -- vivas que apuntan a el.
  update public.subscription_tiers set activo = false
   where id = nivel and creator_id = auth.uid();
end; $$;

create or replace function public.suscribirse(nivel uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); t record; mi_saldo bigint; comision int; para_ella int;
        fin timestamptz; existente record;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  select * into t from public.subscription_tiers where id = nivel and activo;
  if t is null then raise exception 'Ese nivel no existe o ya no esta activo'; end if;
  if t.creator_id = yo then raise exception 'No puedes suscribirte a ti misma'; end if;
  if coalesce(t.precio_coins, 0) <= 0 then
    raise exception 'Ese nivel todavia no tiene precio en coins';
  end if;

  select * into existente from public.subscriptions s
   where s.creator_id = t.creator_id and s.subscriber_id = yo
     and s.estado = 'activa' and s.periodo_fin > now();
  if existente is not null then
    raise exception 'Ya estas suscrita hasta el %', to_char(existente.periodo_fin, 'DD/MM/YYYY');
  end if;

  mi_saldo := public.saldo(yo);
  if mi_saldo < t.precio_coins then
    raise exception 'Te faltan % coins', t.precio_coins - mi_saldo;
  end if;

  comision  := public.comision_de(t.precio_coins);
  para_ella := t.precio_coins - comision;
  fin := now() + interval '30 days';

  -- Una fila por par (creadora, suscriptora): si ya hubo una vencida se
  -- reutiliza en vez de acumular historial muerto.
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
end; $$;

create or replace function public.cancelar_suscripcion(creadora uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- No se corta el acceso: se deja de renovar. Ya pago ese periodo.
  update public.subscriptions
     set cancela_al_fin = true, updated_at = now()
   where subscriber_id = auth.uid() and creator_id = creadora and estado = 'activa';
  if not found then raise exception 'No tienes una suscripcion activa con esa creadora'; end if;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.crear_nivel(text, int, text, int)  from public, anon;
revoke all on function public.borrar_nivel(uuid)                 from public, anon;
revoke all on function public.suscribirse(uuid)                  from public, anon;
revoke all on function public.cancelar_suscripcion(uuid)         from public, anon;
grant execute on function public.crear_nivel(text, int, text, int) to authenticated;
grant execute on function public.borrar_nivel(uuid)                to authenticated;
grant execute on function public.suscribirse(uuid)                 to authenticated;
grant execute on function public.cancelar_suscripcion(uuid)        to authenticated;
