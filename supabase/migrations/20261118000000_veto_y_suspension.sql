-- Veto y suspension.
--
-- Hasta ahora solo `suspended_at` impedia algo, y unicamente al subir un clip
-- o publicar. Una cuenta vetada o suspendida podia seguir comprando, rentando,
-- suscribiendose, dando propinas, pidiendo retiros, vendiendo y borrando sus
-- clips. Esto lo aplica en la base, donde la app no lo puede saltar.
--
-- Una cuenta esta activa si no esta baneada ni suspendida con la suspension
-- vigente (`estado_cuenta`; una suspension con fecha termina sola).
--
-- - Cuenta suspendida o baneada: no hace operaciones de dinero, no publica ni
--   borra clips, no escribe posts, shows, niveles ni mensajes.
-- - Nadie le compra, renta, suscribe, da propina ni encarga a una cuenta
--   suspendida o baneada.
-- - Solo el veto: sus clips salen del catalogo y nadie sin ser administracion
--   los abre, y la cuenta vetada tampoco abre contenido. La suspension, al ser
--   temporal, no toca lo ya comprado.

create or replace function public.cuenta_activa(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.estado_cuenta(uid) = 'activa', false);
$$;
revoke all on function public.cuenta_activa(uuid) from public, anon;
grant execute on function public.cuenta_activa(uuid) to authenticated;

create or replace function public.cuenta_no_baneada(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles p where p.id = uid and p.baneado_at is not null);
$$;
revoke all on function public.cuenta_no_baneada(uuid) from public;
grant execute on function public.cuenta_no_baneada(uuid) to anon, authenticated;

-- ---------- Operaciones de dinero y encargos ----------

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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(c.creator_id) then raise exception 'Ese clip no esta disponible'; end if;
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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(c.creator_id) then raise exception 'Ese clip no esta disponible'; end if;
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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(t.creator_id) then raise exception 'Esa creadora no acepta suscripciones ahora'; end if;
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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(e.creator_id) then raise exception 'Ese encargo no se puede pagar ahora'; end if;

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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(para) then raise exception 'Esa cuenta no puede recibir propinas ahora'; end if;
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

CREATE OR REPLACE FUNCTION public.crear_encargo(creadora uuid, p_descripcion text, p_oferta integer, p_dias integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); nuevo uuid;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  if creadora = yo then raise exception 'No puedes encargarte contenido a ti misma'; end if;
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
  if not public.cuenta_activa(creadora) then raise exception 'Esa creadora no puede recibir encargos ahora'; end if;
  if coalesce(trim(p_descripcion),'') = '' then
    raise exception 'Describe que quieres: sin eso no hay nada que aceptar';
  end if;
  if p_oferta <= 0 then raise exception 'La oferta debe ser mayor que cero'; end if;
  if not exists (select 1 from public.profiles where id = creadora and is_creator) then
    raise exception 'Esa persona no es creadora';
  end if;
  if not public.puede_cobrar(creadora) then
    raise exception 'Esa creadora todavia no puede recibir encargos';
  end if;
  -- Se comprueba el saldo al proponer, no solo al pagar: proponer algo que no
  -- se puede pagar hace perder el tiempo a las dos partes.
  if public.saldo(yo) < p_oferta then
    raise exception 'Te faltan % coins para esa oferta', p_oferta - public.saldo(yo);
  end if;

  insert into public.custom_requests
    (fan_id, creator_id, descripcion, oferta_coins, estado, entrega_max)
  values (yo, creadora, p_descripcion, p_oferta, 'propuesta',
          now() + (greatest(1, p_dias) || ' days')::interval)
  returning id into nuevo;

  insert into public.custom_request_messages (request_id, autor_id, cuerpo, oferta_coins)
  values (nuevo, yo, p_descripcion, p_oferta);

  return jsonb_build_object('ok', true, 'encargo', nuevo);
end; $function$;

CREATE OR REPLACE FUNCTION public.crear_nivel(p_nombre text, p_precio_coins integer, p_descripcion text DEFAULT NULL::text, p_orden integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare yo uuid := auth.uid(); nuevo uuid;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
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
  if not public.cuenta_activa(yo) then raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion'; end if;
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

-- ---------- Acceso a clips: el veto tambien cierra la puerta ----------

CREATE OR REPLACE FUNCTION public.tiene_acceso(clip uuid, uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.consulta_permitida(uid) and public.cuenta_no_baneada(uid) and (exists (
    select 1 from public.clips c
    where c.id = clip
      and c.borrado_at is null
      and public.cuenta_no_baneada(c.creator_id)
      -- Caducado con retiro total: no lo abre nadie, ni quien lo compro.
      and not (c.caduca_at is not null and c.caduca_at <= now()
               and c.caduca_modo = 'retiro_total')
      and (
         c.creator_id = uid                    -- lo suyo, aunque haya caducado
      or (c.published and c.visibility = 'gratis'
          and (c.caduca_at is null or c.caduca_at > now()))
      -- Quien lo compro o lo renta conserva el acceso al caducar: eso fue lo
      -- que se le vendio. Solo el retiro total, arriba, se lo quita.
      or exists (select 1 from public.purchases p
                 where p.clip_id = clip and p.user_id = uid)
      or exists (select 1 from public.rentals r
                 where r.clip_id = clip and r.user_id = uid and r.vence > now())
      or (c.visibility = 'suscriptores'
          and (c.caduca_at is null or c.caduca_at > now())
          and exists (
            select 1 from public.subscriptions s
            where s.creator_id = c.creator_id and s.subscriber_id = uid
              and s.estado = 'activa' and s.periodo_fin > now()))
      )
  ) or (public.es_admin(uid)
        and exists (select 1 from public.clips c2
                     where c2.id = clip and c2.borrado_at is null)));
$function$;

-- ---------- Politicas ----------

alter policy "clips_insert_propio" on public.clips
  with check (((creator_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND p.is_creator AND public.cuenta_activa(p.id) AND p.identidad_verificada)))));

alter policy "clips_delete_propio" on public.clips
  using (((creator_id = auth.uid()) AND public.cuenta_activa(auth.uid())));

alter policy "clips_select_publicados" on public.clips
  using (((published AND public.cuenta_no_baneada(creator_id)) OR (creator_id = auth.uid()) OR es_admin()));

alter policy "encargos_insert_fan" on public.custom_requests
  with check (((fan_id = auth.uid()) AND public.cuenta_activa(auth.uid()) AND (creator_id <> auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = custom_requests.creator_id) AND p.is_creator AND public.cuenta_activa(p.id))))));

alter policy "shows_escribe_propio" on public.live_shows
  using ((creator_id = auth.uid()))
  with check (((creator_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND p.is_creator AND public.cuenta_activa(p.id))))));

alter policy "posts_escribe_propio" on public.posts
  using ((creator_id = auth.uid()))
  with check (((creator_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND p.is_creator AND public.cuenta_activa(p.id))))));

alter policy "msgs_insert" on public.messages
  with check (((sender_id = auth.uid()) AND public.cuenta_activa(auth.uid()) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.a_id = auth.uid()) OR (c.b_id = auth.uid())))))));

alter policy "encargo_msgs_insert" on public.custom_request_messages
  with check (((autor_id = auth.uid()) AND public.cuenta_activa(auth.uid()) AND (EXISTS ( SELECT 1
   FROM custom_requests r
  WHERE ((r.id = custom_request_messages.request_id) AND ((r.fan_id = auth.uid()) OR (r.creator_id = auth.uid())) AND (r.estado = ANY (ARRAY['propuesta'::estado_encargo, 'negociando'::estado_encargo, 'aceptado'::estado_encargo, 'pagado'::estado_encargo, 'en_proceso'::estado_encargo])))))));

alter policy "tiers_escribe_propio" on public.subscription_tiers
  using ((creator_id = auth.uid()))
  with check (((creator_id = auth.uid()) AND public.cuenta_activa(auth.uid())));

