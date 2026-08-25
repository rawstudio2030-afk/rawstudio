-- Modulo 4: comunicacion.
--
-- Dos canales muy distintos:
--   correo  -> sale de la plataforma. Necesita Resend y una llave que vive
--              como secreto del servidor, nunca en este repositorio.
--   mensaje -> entra al buzon de chat que la persona ya usa. No necesita nada
--              externo, y para avisarle algo a una creadora es mas directo
--              que un correo que probablemente acabe en spam.

-- ---------- Plantillas ----------

do $$ begin
  create type public.canal_campana as enum ('correo','mensaje');
exception when duplicate_object then null; end $$;

create table if not exists public.plantillas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 1 and 80),
  canal      public.canal_campana not null,
  asunto     text check (char_length(asunto) <= 200),
  cuerpo     text not null check (char_length(cuerpo) between 1 and 8000),
  creada_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plantillas enable row level security;
create policy plantillas_admin on public.plantillas for select to authenticated
  using (public.es_admin());

-- ---------- Campañas ----------

do $$ begin
  create type public.estado_campana as enum ('borrador','enviando','enviada','fallida');
exception when duplicate_object then null; end $$;

create table if not exists public.campanas (
  id          uuid primary key default gen_random_uuid(),
  canal       public.canal_campana not null,
  segmento    text not null,
  asunto      text,
  cuerpo      text not null,
  estado      public.estado_campana not null default 'borrador',
  destinatarios int not null default 0,
  enviados    int not null default 0,
  fallidos    int not null default 0,
  enviada_por uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  terminada_at timestamptz
);
alter table public.campanas enable row level security;
create policy campanas_admin on public.campanas for select to authenticated
  using (public.es_admin());

-- Quien recibio que. Sin esto el historial diria "enviada a 40" sin poder
-- responder nunca a "¿le llego a esta persona?".
create table if not exists public.campana_destinatarios (
  campana_id uuid not null references public.campanas (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  correo     text,
  ok         boolean,
  error      text,
  created_at timestamptz not null default now(),
  primary key (campana_id, user_id)
);
alter table public.campana_destinatarios enable row level security;
create policy campana_dest_admin on public.campana_destinatarios for select to authenticated
  using (public.es_admin());

-- ---------- Segmentos ----------

-- Se definen aqui y no en el cliente para que la lista que se previsualiza
-- sea EXACTAMENTE la que recibe. Con la consulta en la interfaz, cualquier
-- diferencia entre las dos manda correo a quien no debia.
create or replace function public.admin_segmento(clave text)
returns table (id uuid, handle text, nombre text, correo text)
language sql security definer stable set search_path = '' as $$
  select p.id, p.handle, p.display_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
   where public.es_admin()
     and p.baneado_at is null
     and not p.es_demo
     and case clave
       when 'todas' then true
       when 'creadoras' then p.is_creator
       when 'creadoras_verificadas' then p.is_creator and p.identidad_verificada
       when 'creadoras_sin_verificar' then p.is_creator and not p.identidad_verificada
       when 'creadoras_sin_ventas_30d' then p.is_creator and not exists (
            select 1 from public.coin_ledger l
             where l.user_id = p.id and l.motivo = 'venta_clip'
               and l.created_at > now() - interval '30 days')
       when 'creadoras_sin_chat' then p.is_creator and not exists (
            -- El caso de uso principal: avisarle a quien no esta cobrando por
            -- mensajes que esa funcion existe.
            select 1 from public.messages m
             where m.sender_id = p.id and m.precio_coins > 0)
       when 'creadoras_sin_clips' then p.is_creator and not exists (
            select 1 from public.clips c where c.creator_id = p.id and c.estado = 'aprobado')
       when 'usuarias' then not p.is_creator
       when 'inactivas_30d' then u.last_sign_in_at is null
                              or u.last_sign_in_at < now() - interval '30 days'
       else false
     end
   order by p.created_at desc;
$$;
revoke all on function public.admin_segmento(text) from public, anon;
grant execute on function public.admin_segmento(text) to authenticated;

-- ---------- Enviar mensaje interno ----------

create or replace function public.admin_mensaje_interno(
  destino uuid, texto text, campana uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); conv uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede enviar mensajes de plataforma'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(texto),'') = '' then
    raise exception 'El mensaje no puede ir vacio';
  end if;
  if destino = yo then return jsonb_build_object('ok', true, 'omitido', true); end if;

  -- La conversacion guarda el par sin orden fijo, asi que hay que buscar en
  -- las dos direcciones antes de crear una nueva; si no, quedarian dos hilos
  -- paralelos entre las mismas dos personas.
  select c.id into conv from public.conversations c
   where (c.a_id = yo and c.b_id = destino) or (c.a_id = destino and c.b_id = yo)
   limit 1;
  if conv is null then
    insert into public.conversations (a_id, b_id) values (yo, destino) returning id into conv;
  end if;

  -- precio_coins 0: un aviso de la plataforma no se cobra.
  insert into public.messages (conversation_id, sender_id, cuerpo, precio_coins)
  values (conv, yo, texto, 0);
  update public.conversations set ultimo_at = now() where id = conv;

  if campana is not null then
    insert into public.campana_destinatarios (campana_id, user_id, ok)
    values (campana, destino, true)
    on conflict (campana_id, user_id) do update set ok = true, error = null;
  end if;

  return jsonb_build_object('ok', true, 'conversacion', conv);
end; $$;
revoke all on function public.admin_mensaje_interno(uuid, text, uuid) from public, anon;
grant execute on function public.admin_mensaje_interno(uuid, text, uuid) to authenticated;

-- ---------- Campañas: abrir, anotar, cerrar ----------

create or replace function public.admin_abrir_campana(
  p_canal public.canal_campana, p_segmento text, p_asunto text, p_cuerpo text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare nueva uuid; cuantos int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede enviar campañas'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_cuerpo),'') = '' then
    raise exception 'La campaña no puede ir sin cuerpo';
  end if;
  if p_canal = 'correo' and coalesce(trim(p_asunto),'') = '' then
    raise exception 'Un correo sin asunto se lee como spam: pon uno';
  end if;

  select count(*) into cuantos from public.admin_segmento(p_segmento);
  if cuantos = 0 then
    raise exception 'Ese segmento no tiene a nadie ahora mismo';
  end if;

  insert into public.campanas (canal, segmento, asunto, cuerpo, estado,
                               destinatarios, enviada_por)
  values (p_canal, p_segmento, p_asunto, p_cuerpo, 'enviando', cuantos, auth.uid())
  returning id into nueva;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'enviar_campana', auth.uid(),
          jsonb_build_object('campana', nueva, 'canal', p_canal,
                             'segmento', p_segmento, 'destinatarios', cuantos));
  return nueva;
end; $$;

create or replace function public.admin_cerrar_campana(campana uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ok int; mal int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cerrar campañas'
      using errcode = 'insufficient_privilege';
  end if;
  select count(*) filter (where d.ok), count(*) filter (where not d.ok)
    into ok, mal from public.campana_destinatarios d where d.campana_id = campana;

  update public.campanas
     set enviados = ok, fallidos = mal, terminada_at = now(),
         estado = case when mal > 0 and ok = 0 then 'fallida' else 'enviada' end
   where id = campana;
  return jsonb_build_object('ok', true, 'enviados', ok, 'fallidos', mal);
end; $$;

create or replace function public.admin_anotar_destinatario(
  campana uuid, destino uuid, correo text, exito boolean, detalle text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador' using errcode = 'insufficient_privilege';
  end if;
  insert into public.campana_destinatarios (campana_id, user_id, correo, ok, error)
  values (campana, destino, correo, exito, detalle)
  on conflict (campana_id, user_id)
    do update set ok = exito, error = detalle, correo = excluded.correo;
end; $$;

revoke all on function public.admin_abrir_campana(public.canal_campana, text, text, text) from public, anon;
revoke all on function public.admin_cerrar_campana(uuid) from public, anon;
revoke all on function public.admin_anotar_destinatario(uuid, uuid, text, boolean, text) from public, anon;
grant execute on function public.admin_abrir_campana(public.canal_campana, text, text, text) to authenticated;
grant execute on function public.admin_cerrar_campana(uuid) to authenticated;
grant execute on function public.admin_anotar_destinatario(uuid, uuid, text, boolean, text) to authenticated;

-- ---------- Plantillas: escribir ----------

create or replace function public.admin_guardar_plantilla(
  p_nombre text, p_canal public.canal_campana, p_asunto text, p_cuerpo text,
  p_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare r uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador' using errcode = 'insufficient_privilege';
  end if;
  if p_id is null then
    insert into public.plantillas (nombre, canal, asunto, cuerpo, creada_por)
    values (p_nombre, p_canal, p_asunto, p_cuerpo, auth.uid()) returning id into r;
  else
    update public.plantillas
       set nombre = p_nombre, canal = p_canal, asunto = p_asunto,
           cuerpo = p_cuerpo, updated_at = now()
     where id = p_id returning id into r;
  end if;
  return r;
end; $$;

create or replace function public.admin_borrar_plantilla(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador' using errcode = 'insufficient_privilege';
  end if;
  delete from public.plantillas where id = p_id;
end; $$;

revoke all on function public.admin_guardar_plantilla(text, public.canal_campana, text, text, uuid) from public, anon;
revoke all on function public.admin_borrar_plantilla(uuid) from public, anon;
grant execute on function public.admin_guardar_plantilla(text, public.canal_campana, text, text, uuid) to authenticated;
grant execute on function public.admin_borrar_plantilla(uuid) to authenticated;
