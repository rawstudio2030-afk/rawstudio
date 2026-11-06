-- Escrituras de clips y saldo.
--
-- 1) clips: lo que decide la plataforma (estado, moderacion, borrado, tipo,
--    destacados, caducidad) solo se cambia por las funciones de la
--    administracion, que corren con permisos propios. La creadora puede subir
--    un clip y borrar el suyo; no puede editar esas columnas, ni por la API
--    ni por SQL directo. Los clientes de la app no hacen UPDATE sobre clips.
--
-- 2) Los archivos de un clip viven en la carpeta de su creadora. La politica
--    de lectura de storage compara la ruta del clip con el nombre del
--    archivo, asi que la ruta no puede apuntar a la carpeta de otra persona.
--
-- 3) El saldo nunca baja de cero por una compra, una renta, una suscripcion,
--    un encargo, una propina o un retiro, aunque lleguen dos a la vez.

-- ---------- 1) Columnas que la creadora puede escribir ----------

revoke update on public.clips from anon, authenticated;
revoke insert on public.clips from anon, authenticated;

grant insert (creator_id, title, description, storage_path, cover_path,
              duration_s, visibility, price_coins, published,
              renta_horas, renta_coins, preview_path, caduca_at)
  on public.clips to authenticated;

-- ---------- 2) Rutas dentro de la carpeta de la creadora ----------
-- Disparador y no CHECK: solo mira las filas nuevas o cuando cambia una ruta,
-- asi una moderacion o un borrado sobre un clip anterior no depende de que
-- su ruta cumpla una regla que entonces no existia.

create or replace function public.clips_archivos_en_su_carpeta()
returns trigger language plpgsql set search_path = '' as $$
declare propia text := new.creator_id::text || '/';
begin
  if (new.storage_path is not null and left(new.storage_path, length(propia)) <> propia)
  or (new.cover_path   is not null and left(new.cover_path,   length(propia)) <> propia)
  or (new.preview_path is not null and left(new.preview_path, length(propia)) <> propia) then
    raise exception 'Los archivos de un clip tienen que estar en la carpeta de su creadora';
  end if;
  return new;
end; $$;

drop trigger if exists clips_archivos_en_su_carpeta on public.clips;
create trigger clips_archivos_en_su_carpeta
  before insert or update of storage_path, cover_path, preview_path, creator_id on public.clips
  for each row execute function public.clips_archivos_en_su_carpeta();

-- ---------- 3) Saldo no negativo ----------

create or replace function public.ledger_no_deja_saldo_negativo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actual bigint;
begin
  if new.delta >= 0 or new.motivo not in ('compra_clip', 'propina', 'retiro') then
    return new;
  end if;
  -- El candado va por usuario y se libera al terminar la transaccion. Quien
  -- llega segundo espera, y al leer ya ve el cargo del primero.
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || new.user_id::text, 0));
  select coalesce(sum(delta), 0) into actual
    from public.coin_ledger where user_id = new.user_id;
  if actual + new.delta < 0 then
    raise exception 'El saldo ya no alcanza para este movimiento';
  end if;
  return new;
end; $$;
revoke all on function public.ledger_no_deja_saldo_negativo() from public, anon, authenticated;

drop trigger if exists ledger_saldo_no_negativo on public.coin_ledger;
create trigger ledger_saldo_no_negativo
  before insert on public.coin_ledger
  for each row execute function public.ledger_no_deja_saldo_negativo();

-- ---------- Cada operacion de dinero se serializa por usuario ----------

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

  mi_saldo := public.saldo(yo);
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
  if public.saldo(yo) < precio then
    raise exception 'Te faltan % coins', precio - public.saldo(yo);
  end if;

  -- Solo el cargo. A la creadora NO se le abona aqui: el dinero queda
  -- retenido por la plataforma hasta que entregue. Es lo unico que hace
  -- posible reembolsar si no cumple.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -precio, 'compra_clip', encargo, yo, 'Encargo pagado');

  update public.custom_requests set estado = 'pagado', updated_at = now() where id = encargo;
  return jsonb_build_object('ok', true, 'retenido', precio);
end; $function$;

CREATE OR REPLACE FUNCTION public.solicitar_retiro(cantidad integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); cta record; minimo int; disponible bigint; nueva uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || coalesce(yo::text, ''), 0));
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

  mi_saldo := public.saldo(yo);
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

