-- Alta de creadoras por administración, con expediente documental.
--
-- Caso real: la operadora ya tiene material y consentimientos firmados de antes
-- de que existiera la plataforma. Esa creadora no puede registrarse sola —el
-- material ya está grabado— y colgarlo de un perfil de relleno lo dejaría sin
-- dueño ni constancia.
--
-- PROPIEDAD CENTRAL DE ESTE ARCHIVO
-- El alta NO marca la identidad como verificada. Eso solo ocurre cuando los
-- documentos están efectivamente cargados, y se comprueba con un trigger, no
-- con disciplina de quien programa. La diferencia importa: con la versión
-- anterior la constancia era una afirmación; aquí es un archivo que existe.

create table public.expedientes (
  user_id       uuid primary key references public.profiles (id) on delete cascade,

  -- Quién dio de alta y cuándo. Si un día hay que responder con qué respaldo se
  -- publicó ese material, esta es la respuesta.
  alta_por      uuid not null references auth.users (id),
  alta_at       timestamptz not null default now(),

  identificacion_path text,   -- bucket privado 'expedientes'
  consentimiento_path text,

  -- Puede ser muy anterior al alta: son papeles firmados antes.
  consentimiento_fecha date,
  nota          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.expedientes enable row level security;

-- Solo administración. Ni la propia creadora: son documentos que ella ya tiene,
-- y cada vía de lectura es una vía de fuga.
create policy expedientes_admin on public.expedientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expedientes', 'expedientes', false, 12 * 1024 * 1024,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false;

create policy expedientes_archivos_admin on storage.objects for all to authenticated
  using (bucket_id = 'expedientes' and public.es_admin())
  with check (bucket_id = 'expedientes' and public.es_admin());

-- ── La verificación se enciende sola, y solo con documentos ─────────────────
-- Va en trigger y no en la función de alta para que no dependa de acordarse:
-- cualquier camino que complete el expediente marca el perfil, y ninguno que
-- lo deje incompleto puede marcarlo.
create or replace function public.expediente_verifica()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.identificacion_path is not null and new.consentimiento_path is not null then
    update public.profiles
       set identidad_verificada = true,
           identidad_verificada_at = coalesce(identidad_verificada_at, now())
     where id = new.user_id and not identidad_verificada;
  else
    -- Si se retiran los documentos, se retira la verificación. Un expediente
    -- vaciado no puede dejar atrás una constancia que ya no respalda nada.
    update public.profiles
       set identidad_verificada = false, identidad_verificada_at = null
     where id = new.user_id and identidad_verificada;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger expediente_verifica
  before insert or update on public.expedientes
  for each row execute function public.expediente_verifica();

-- ── Dar de alta ─────────────────────────────────────────────────────────────
create or replace function public.admin_alta_creadora(
  p_handle text, p_nombre text, p_bio text default null,
  p_consentimiento_fecha date default null, p_nota text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  nuevo uuid := gen_random_uuid();
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede dar de alta creadoras'
      using errcode = 'insufficient_privilege';
  end if;
  if p_handle !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'El usuario debe tener entre 3 y 24 caracteres: letras, números y guion bajo';
  end if;
  if exists (select 1 from public.profiles where handle = p_handle) then
    raise exception 'Ese nombre de usuario ya está tomado';
  end if;

  -- Correo técnico: la creadora no entra por aquí. Si más adelante quiere su
  -- propio acceso, se le liga una identidad real y este queda de respaldo.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values (nuevo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_handle || '@alta.rawstudio.biz', '', now(), now(), now());

  update public.profiles set
    handle = p_handle, display_name = p_nombre, bio = p_bio,
    is_creator = true, adult_confirmed_at = now(), es_demo = false
  where id = nuevo;

  -- Expediente vacío: el perfil queda SIN verificar hasta que se suban los
  -- documentos. Publicar seguirá rechazándose hasta entonces.
  insert into public.expedientes (user_id, alta_por, consentimiento_fecha, nota)
  values (nuevo, auth.uid(), p_consentimiento_fecha, p_nota);

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'alta_creadora', nuevo,
          jsonb_build_object('handle', p_handle, 'nota', p_nota));

  return jsonb_build_object('ok', true, 'id', nuevo, 'handle', p_handle,
                            'verificada', false);
end;
$$;

create or replace function public.admin_expediente_documentos(
  creadora uuid, identificacion text, consentimiento text,
  fecha date default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v boolean;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cargar expedientes'
      using errcode = 'insufficient_privilege';
  end if;

  update public.expedientes
     set identificacion_path = identificacion,
         consentimiento_path = consentimiento,
         consentimiento_fecha = coalesce(fecha, consentimiento_fecha)
   where user_id = creadora;
  if not found then raise exception 'Esa creadora no tiene expediente'; end if;

  select identidad_verificada into v from public.profiles where id = creadora;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'expediente_documentos', creadora,
          jsonb_build_object('verificada', v));

  return jsonb_build_object('ok', true, 'verificada', v);
end;
$$;

-- ── Publicar por ella ───────────────────────────────────────────────────────
create or replace function public.admin_publicar_para(
  creadora uuid, p_titulo text, p_archivo text, p_portada text default null,
  p_precio int default 240, p_visibilidad public.visibilidad_clip default 'pago',
  p_descripcion text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare cid uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede publicar por otra persona'
      using errcode = 'insufficient_privilege';
  end if;
  -- Sin expediente completo no se publica. Es la misma regla que aplica a
  -- cualquier creadora: la diferencia es de dónde salió la constancia.
  if not exists (select 1 from public.profiles p
                 where p.id = creadora and p.identidad_verificada) then
    raise exception 'Falta cargar los documentos del expediente antes de publicar';
  end if;

  insert into public.clips (creator_id, title, description, storage_path, cover_path,
                            visibility, price_coins, published, published_at)
  values (creadora, p_titulo, p_descripcion, p_archivo, p_portada,
          p_visibilidad, case when p_visibilidad = 'pago' then p_precio else 0 end,
          true, now())
  returning id into cid;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'publicar_para', creadora,
          jsonb_build_object('clip', cid, 'titulo', p_titulo));

  return jsonb_build_object('ok', true, 'clip', cid);
end;
$$;

revoke all on function public.admin_alta_creadora(text, text, text, date, text) from public, anon;
revoke all on function public.admin_expediente_documentos(uuid, text, text, date) from public, anon;
revoke all on function public.admin_publicar_para(uuid, text, text, text, int, public.visibilidad_clip, text) from public, anon;
grant execute on function public.admin_alta_creadora(text, text, text, date, text) to authenticated;
grant execute on function public.admin_expediente_documentos(uuid, text, text, date) to authenticated;
grant execute on function public.admin_publicar_para(uuid, text, text, text, int, public.visibilidad_clip, text) to authenticated;
