-- Correo y telefono de contacto.
--
-- DOS DATOS, DOS SITIOS DISTINTOS, y la diferencia importa.
--
-- El CORREO no es un campo nuevo. Ya existe: es el de `auth.users`, que es el
-- que usa Supabase para recuperar contraseña. Guardar una segunda copia en
-- otra tabla crearia dos respuestas a «¿a donde le escribimos?», y el dia que
-- se separen el correo de recuperacion se va a ir a la equivocada. Lo que
-- estaba mal no era que faltara: era que `admin_alta_creadora` se lo INVENTABA
-- —handle@alta.rawstudio.biz— asi que las creadoras dadas de alta por
-- administracion no tienen a donde recibir nada.
--
-- El TELEFONO si es nuevo, y NO puede ir en `profiles`: esa tabla es de
-- lectura publica a proposito —es el directorio de creadoras— y ahi dentro un
-- telefono lo puede leer cualquiera con la llave anonima. Tabla aparte, que
-- solo ven su dueña y quien administra.

create table if not exists public.contactos (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  -- Diez digitos para Mexico, o con + y codigo de pais. Se guarda como se
  -- escribio salvo espacios y guiones: normalizar a E.164 de verdad necesita
  -- saber el pais, y aqui todavia no se pregunta.
  telefono   text check (telefono is null or telefono ~ '^\+?[0-9]{10,15}$'),
  nota       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contactos enable row level security;

-- Su dueña lo ve y lo cambia; quien administra lo ve para poder contactarla.
-- Nadie mas, y nunca el publico.
create policy contactos_propio on public.contactos for all to authenticated
  using (user_id = auth.uid() or public.es_admin())
  with check (user_id = auth.uid() or public.es_admin());

-- ---------- El alta ahora pide los dos ----------
--
-- Los dos parametros llevan valor por omision para que PostgREST siga
-- resolviendo la funcion aunque llegue una llamada vieja: asi el error es
-- «Falta el correo» y no «no existe esa funcion», que no le dice nada a nadie.
create or replace function public.admin_alta_creadora(
  p_handle text, p_nombre text, p_bio text default null,
  p_consentimiento_fecha date default null, p_nota text default null,
  p_email text default null, p_telefono text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  nuevo uuid := gen_random_uuid();
  correo text := lower(trim(coalesce(p_email, '')));
  tel    text := regexp_replace(coalesce(p_telefono, ''), '[\s()-]', '', 'g');
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

  -- Sin correo real no hay forma de recuperar la contraseña ni de avisarle
  -- nada. Antes se inventaba uno y el alta parecia completa.
  if correo = '' then
    raise exception 'Falta el correo: sin él no se le puede escribir ni recuperar su contraseña';
  end if;
  if correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no tiene forma de correo: %', correo;
  end if;
  if exists (select 1 from auth.users where lower(email) = correo) then
    raise exception 'Ya hay una cuenta con el correo %', correo;
  end if;

  if tel = '' then
    raise exception 'Falta el teléfono';
  end if;
  if tel !~ '^\+?[0-9]{10,15}$' then
    raise exception 'Ese teléfono no cuadra: son 10 dígitos si es de México, o con + y código de país';
  end if;

  -- La contraseña queda vacia a proposito: ella entra pidiendo una nueva
  -- desde «olvidé mi contraseña», que ahora si puede llegarle.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values (nuevo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          correo, '', now(), now(), now());

  update public.profiles set
    handle = p_handle, display_name = p_nombre, bio = p_bio,
    is_creator = true, adult_confirmed_at = now(), es_demo = false
  where id = nuevo;

  insert into public.contactos (user_id, telefono) values (nuevo, tel);

  -- Expediente vacío: el perfil queda SIN verificar hasta que se suban los
  -- documentos. Publicar seguirá rechazándose hasta entonces.
  insert into public.expedientes (user_id, alta_por, consentimiento_fecha, nota)
  values (nuevo, auth.uid(), p_consentimiento_fecha, p_nota);

  -- El correo NO se anota en la bitacora: queda en auth.users, y repetirlo en
  -- una tabla que lee todo el equipo lo esparce sin necesidad.
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'alta_creadora', nuevo,
          jsonb_build_object('handle', p_handle, 'nota', p_nota));

  return jsonb_build_object('ok', true, 'id', nuevo, 'handle', p_handle,
                            'verificada', false);
end;
$$;

revoke all on function public.admin_alta_creadora(text, text, text, date, text, text, text) from public, anon;
grant execute on function public.admin_alta_creadora(text, text, text, date, text, text, text) to authenticated;

-- ---------- Corregir el correo de quien ya esta dada de alta ----------
--
-- Hacen falta: las creadoras dadas de alta antes de esta migracion tienen un
-- correo inventado y sin esto se quedan incomunicadas para siempre.
create or replace function public.admin_cambiar_correo(objetivo uuid, correo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare limpio text := lower(trim(correo)); antes text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar un correo'
      using errcode = 'insufficient_privilege';
  end if;
  if limpio !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no tiene forma de correo';
  end if;
  if exists (select 1 from auth.users where lower(email) = limpio and id <> objetivo) then
    raise exception 'Ya hay otra cuenta con ese correo';
  end if;

  select email into antes from auth.users where id = objetivo;
  if antes is null then raise exception 'No existe esa cuenta'; end if;

  update auth.users set email = limpio, updated_at = now() where id = objetivo;

  -- En la bitacora va el DOMINIO del correo anterior y no el correo entero:
  -- alcanza para saber que se corrigio uno inventado —@alta.rawstudio.biz— sin
  -- dejar direcciones personales regadas en una tabla que lee todo el equipo.
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'cambiar_correo', objetivo,
          jsonb_build_object('dominio_anterior', split_part(antes, '@', 2)));

  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.admin_cambiar_correo(uuid, text) from public, anon;
grant execute on function public.admin_cambiar_correo(uuid, text) to authenticated;
