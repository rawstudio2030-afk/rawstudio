-- Mayoria de edad y consentimiento biometrico, exigidos en el servidor.
--
-- 1) adult_confirmed_at lo escribia la propia cuenta con la fecha que quisiera,
--    se podia reescribir o borrar, no dejaba constancia y ninguna funcion lo
--    exigia. Ahora:
--    - la primera vez, la cuenta solo puede fijarla "ahora"; despues no se
--      reescribe ni se borra (administracion y el servidor si pueden);
--    - queda una constancia en `consentimientos` (version, IP y agente);
--    - comprar, rentar, suscribirse, propinas, encargos y retiros la exigen,
--      y tambien abrir un clip desde una cuenta con sesion.
--    Sigue siendo una DECLARACION de la persona, no una verificacion: lo que
--    el servidor garantiza es que no se falsifica ni se salta. Para quien
--    mira sin cuenta, la puerta de edad sigue siendo la pantalla del sitio.
--
-- 2) Nada exigia el consentimiento expreso para datos biometricos antes de
--    recibir la INE y la selfie. Ahora ni la solicitud de verificacion ni la
--    subida de las imagenes pasan sin un consentimiento vigente.
--    `registrar_consentimiento` lo anota con la version del documento y la IP.

alter type public.tipo_consentimiento add value if not exists 'mayoria_edad';

-- ---------- Mayoria de edad ----------

create or replace function public.profiles_mayoria_de_edad()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Servidor sin sesion, llave de servicio y administracion: tal cual.
  if auth.role() is null or auth.role() = 'service_role' or public.es_admin() then
    return new;
  end if;
  -- Quien la confirmo, confirmada se queda: ni otra fecha ni borrarla.
  if old.adult_confirmed_at is not null then
    new.adult_confirmed_at := old.adult_confirmed_at;
    return new;
  end if;
  -- La primera vez vale "ahora", no la fecha que mande el cliente.
  new.adult_confirmed_at := now();
  insert into public.consentimientos (user_id, tipo, version, otorgado, ip, agente)
  values (new.id, 'mayoria_edad',
          coalesce((select d.version from public.documentos_legales d where d.tipo::text = 'mayoria_edad'), 'v1.0'),
          true, public.ip_solicitante(),
          left(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'user-agent', ''), 300));
  return new;
end; $$;
revoke all on function public.profiles_mayoria_de_edad() from public, anon, authenticated;

drop trigger if exists profiles_mayoria_de_edad on public.profiles;
create trigger profiles_mayoria_de_edad
  before update of adult_confirmed_at on public.profiles
  for each row when (new.adult_confirmed_at is distinct from old.adult_confirmed_at)
  execute function public.profiles_mayoria_de_edad();

create or replace function public.mayor_confirmada(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.adult_confirmed_at is not null);
$$;
revoke all on function public.mayor_confirmada(uuid) from public, anon, authenticated;

-- ---------- Consentimientos ----------

-- Ultimo consentimiento del tipo: vale si esta otorgado y no se revoco despues.
-- Solo contesta sobre la propia cuenta (o administracion / servidor).
create or replace function public.consentimiento_vigente(uid uuid, p_tipo public.tipo_consentimiento)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.consulta_permitida(uid) and coalesce((
    select c.otorgado from public.consentimientos c
     where c.user_id = uid and c.tipo = p_tipo
     order by c.created_at desc, c.id desc limit 1), false);
$$;
revoke all on function public.consentimiento_vigente(uuid, public.tipo_consentimiento) from public, anon;
grant execute on function public.consentimiento_vigente(uuid, public.tipo_consentimiento) to authenticated;

-- La constancia de mayoria de edad solo la escribe el disparador de arriba.
create or replace function public.registrar_consentimiento(
  p_tipo public.tipo_consentimiento, p_otorgado boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); ver text;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;
  if p_tipo::text = 'mayoria_edad' then
    raise exception 'Ese consentimiento no se registra asi';
  end if;
  select d.version into ver from public.documentos_legales d where d.tipo = p_tipo;
  insert into public.consentimientos (user_id, tipo, version, otorgado, ip, agente)
  values (yo, p_tipo, coalesce(ver, 'v1.0'), coalesce(p_otorgado, false),
          public.ip_solicitante(),
          left(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'user-agent', ''), 300));
  return jsonb_build_object('ok', true, 'version', coalesce(ver, 'v1.0'));
end; $$;
revoke all on function public.registrar_consentimiento(public.tipo_consentimiento, boolean) from public, anon;
grant execute on function public.registrar_consentimiento(public.tipo_consentimiento, boolean) to authenticated;

-- La subida de la INE y la selfie exige el consentimiento biometrico vigente.
alter policy "verif_subir_propio" on storage.objects
  with check (
    bucket_id = 'verificacion'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.consentimiento_vigente(auth.uid(), 'biometricos')
  );

-- ---------- La mayoria de edad, exigida ----------

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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
  if not public.mayor_confirmada(yo) then raise exception 'Confirma que eres mayor de edad para continuar'; end if;
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
      -- Una cuenta con sesion tiene que haber confirmado la mayoria de edad.
      and (uid is null or public.mayor_confirmada(uid))
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

-- ---------- La verificacion exige el consentimiento biometrico ----------

CREATE OR REPLACE FUNCTION public.solicitar_verificacion_v2(nacimiento date, ine text, selfie text, documento text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  yo uuid := auth.uid();
  hash text;
  edad int;
  pendientes int;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;

  if not public.consentimiento_vigente(yo, 'biometricos') then
    raise exception 'Para verificar tu identidad necesitamos tu consentimiento expreso al tratamiento de tus datos biometricos (INE y selfie)';
  end if;
  if (select identidad_verificada from public.profiles where id = yo) then
    raise exception 'Tu identidad ya está verificada';
  end if;

  if nacimiento is null or nacimiento > current_date then
    raise exception 'La fecha de nacimiento no es válida';
  end if;
  edad := extract(year from age(current_date, nacimiento));
  if edad > 120 then raise exception 'La fecha de nacimiento no es válida'; end if;
  if edad < 18 then
    raise exception 'Debes ser mayor de 18 años para publicar en RAWstudio';
  end if;

  select count(*) into pendientes from public.verificaciones
   where user_id = yo and estado in ('procesando', 'pendiente_revision');
  if pendientes > 0 then
    raise exception 'Ya tienes una verificación en revisión. Te avisamos en cuanto se resuelva.';
  end if;

  if documento is not null and trim(documento) <> '' then
    -- El hash se calcula en el servidor: el número en claro no viaja más allá
    -- de esta llamada ni queda en ninguna tabla.
    hash := encode(extensions.digest(upper(trim(documento)), 'sha256'), 'hex');
    if exists (select 1 from public.profiles
               where documento_hash = hash and id <> yo) then
      raise exception 'Ese documento ya está registrado en otra cuenta';
    end if;
  end if;

  insert into public.verificaciones
    (user_id, estado, fecha_nacimiento, edad, documento_hash,
     ine_path, selfie_path, motivo, borrar_despues_de)
  values
    (yo, 'pendiente_revision', nacimiento, edad, hash,
     ine, selfie, 'Revisión manual', now() + interval '30 days');

  return jsonb_build_object('ok', true, 'estado', 'pendiente_revision', 'edad', edad);
end;
$function$;

CREATE OR REPLACE FUNCTION public.solicitar_verificacion(curp text, ine text, selfie text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  yo uuid := auth.uid();
  hash text;
  pendientes int;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;

  if not public.consentimiento_vigente(yo, 'biometricos') then
    raise exception 'Para verificar tu identidad necesitamos tu consentimiento expreso al tratamiento de tus datos biometricos (INE y selfie)';
  end if;

  if (select identidad_verificada from public.profiles where id = yo) then
    raise exception 'Tu identidad ya está verificada';
  end if;

  -- Una a la vez: sin esto, alguien podria saturar la cola de revision.
  select count(*) into pendientes from public.verificaciones
   where user_id = yo and estado in ('procesando', 'pendiente_revision');
  if pendientes > 0 then
    raise exception 'Ya tienes una verificación en revisión. Te avisamos en cuanto se resuelva.';
  end if;

  -- El hash se calcula en el servidor, no en el navegador: asi la CURP en
  -- claro no viaja mas alla de esta llamada ni queda en ninguna tabla.
  hash := encode(extensions.digest(upper(trim(curp)), 'sha256'), 'hex');

  if exists (select 1 from public.profiles
             where curp_hash = hash and id <> yo) then
    raise exception 'Esa CURP ya está registrada en otra cuenta';
  end if;

  insert into public.verificaciones
    (user_id, estado, curp_hash, ine_path, selfie_path, motivo,
     borrar_despues_de)
  values
    (yo, 'pendiente_revision', hash, ine, selfie,
     'Revisión manual',
     now() + interval '30 days');   -- red de seguridad si nadie la resuelve

  return jsonb_build_object('ok', true, 'estado', 'pendiente_revision');
end;
$function$;

