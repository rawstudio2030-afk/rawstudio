-- Articulos, instrucciones y preguntas frecuentes, gestionados desde el panel.
--
-- Hasta hoy el sitio no tenia donde publicar texto de la plataforma: las
-- preguntas frecuentes viven en codigo (`src/content/ayuda.ts`) y el unico blog
-- (`/estudio/blog`) es de cada creadora. Esto es la seccion que faltaba, con el
-- control en el panel de administracion:
--
--   - Tres tipos fijos: `articulo` (texto de fondo), `instruccion` (paso a
--     paso) y `pregunta` (el titulo es la pregunta; el cuerpo, la respuesta).
--   - Se escribe en el panel; un PDF adjunto es opcional (bucket privado
--     `articulos`).
--   - Se LEEN solo con sesion iniciada (decision de Sergio, 12 nov 2026), y la
--     puerta de edad del sitio sigue aplicando. Nada se sirve a `anon`.
--   - Nace como borrador. Publicar y despublicar son acciones aparte.
--   - Cada articulo puede marcarse `en_bot`: el bot de Telegram lo lista con un
--     enlace al sitio. `titulo_bot` es un titulo corto y neutro para Telegram
--     (el titulo largo puede ser explicito; el del bot no tiene por que serlo).
--     El contenido NUNCA viaja por Telegram: solo el enlace.
--
-- ---------- Como se accede ----------
-- La tabla esta cerrada: RLS activado, sin politicas y sin permisos para
-- `anon` ni `authenticated`. TODO pasa por funciones `security definer` con
-- `search_path = ''`, igual que albumes, comentarios y avisos:
--   - lectura (cualquier cuenta con sesion): `articulos_publicados`,
--     `articulo_publicado`
--   - administracion (solo `es_admin()`): `admin_articulos`,
--     `admin_articulo_guardar`, `admin_articulo_publicar`, `admin_articulo_borrar`
--   - bot (solo `service_role`): `bot_articulos_lista`
-- Cada accion de administracion deja una fila en `admin_log`.

create table public.articulos (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('articulo', 'instruccion', 'pregunta')),
  titulo         text not null check (char_length(btrim(titulo)) between 3 and 140),
  -- Titulo corto y neutro para el bot de Telegram; si falta, se usa el titulo
  -- recortado a 60 caracteres.
  titulo_bot     text check (titulo_bot is null or char_length(btrim(titulo_bot)) between 3 and 60),
  resumen        text check (resumen is null or char_length(resumen) <= 300),
  cuerpo         text not null check (char_length(btrim(cuerpo)) between 1 and 30000),
  -- Ruta del PDF dentro del bucket `articulos`; null = sin adjunto.
  pdf_path       text check (pdf_path is null
                             or (pdf_path ~ '^[A-Za-z0-9._/-]{5,200}\.pdf$' and pdf_path !~ '\.\.')),
  publicado      boolean not null default false,
  en_bot         boolean not null default false,
  -- Menor sale primero; a igual orden, el mas reciente.
  orden          int not null default 0,
  creado_por     uuid references auth.users (id) on delete set null,
  creado_at      timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  publicado_at   timestamptz
);
create index articulos_lista_idx on public.articulos (publicado, orden, publicado_at desc);

alter table public.articulos enable row level security;
revoke all on public.articulos from anon, authenticated;

-- ---------- Lectura (cualquier cuenta con sesion) ----------

create or replace function public.articulos_publicados()
returns table (id uuid, tipo text, titulo text, resumen text, tiene_pdf boolean, publicado_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.tipo, a.titulo, a.resumen, a.pdf_path is not null, a.publicado_at
    from public.articulos a
   where a.publicado and auth.uid() is not null
   order by a.orden, a.publicado_at desc;
$$;

create or replace function public.articulo_publicado(p_id uuid)
returns table (id uuid, tipo text, titulo text, resumen text, cuerpo text, pdf_path text, publicado_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.tipo, a.titulo, a.resumen, a.cuerpo, a.pdf_path, a.publicado_at
    from public.articulos a
   where a.id = p_id and a.publicado and auth.uid() is not null;
$$;

-- ---------- Administracion ----------

create or replace function public.admin_articulos()
returns table (
  id uuid, tipo text, titulo text, titulo_bot text, resumen text, cuerpo text, pdf_path text,
  publicado boolean, en_bot boolean, orden int, creado_at timestamptz,
  actualizado_at timestamptz, publicado_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los articulos en borrador'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select a.id, a.tipo, a.titulo, a.titulo_bot, a.resumen, a.cuerpo, a.pdf_path,
           a.publicado, a.en_bot, a.orden, a.creado_at, a.actualizado_at, a.publicado_at
      from public.articulos a
     order by a.publicado desc, a.orden, a.actualizado_at desc;
end; $$;

-- Crea (p_id null) o edita. NO cambia si esta publicado: eso es `admin_articulo_publicar`.
create or replace function public.admin_articulo_guardar(
  p_id uuid, p_tipo text, p_titulo text, p_titulo_bot text, p_resumen text,
  p_cuerpo text, p_pdf_path text, p_en_bot boolean, p_orden int
) returns uuid language plpgsql security definer set search_path = '' as $$
declare nuevo uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede guardar articulos'
      using errcode = 'insufficient_privilege';
  end if;

  if p_id is null then
    insert into public.articulos (tipo, titulo, titulo_bot, resumen, cuerpo, pdf_path, en_bot, orden, creado_por)
    values (p_tipo, btrim(p_titulo), nullif(btrim(coalesce(p_titulo_bot, '')), ''),
            nullif(btrim(coalesce(p_resumen, '')), ''), p_cuerpo, nullif(btrim(coalesce(p_pdf_path, '')), ''),
            coalesce(p_en_bot, false), coalesce(p_orden, 0), auth.uid())
    returning id into nuevo;
  else
    update public.articulos
       set tipo = p_tipo, titulo = btrim(p_titulo),
           titulo_bot = nullif(btrim(coalesce(p_titulo_bot, '')), ''),
           resumen = nullif(btrim(coalesce(p_resumen, '')), ''),
           cuerpo = p_cuerpo, pdf_path = nullif(btrim(coalesce(p_pdf_path, '')), ''),
           en_bot = coalesce(p_en_bot, false), orden = coalesce(p_orden, 0),
           actualizado_at = now()
     where id = p_id
    returning id into nuevo;
    if nuevo is null then raise exception 'Ese articulo no existe'; end if;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), case when p_id is null then 'articulo_crear' else 'articulo_editar' end, null,
          jsonb_build_object('articulo', nuevo, 'titulo', btrim(p_titulo), 'tipo', p_tipo));
  return nuevo;
end; $$;

create or replace function public.admin_articulo_publicar(p_id uuid, p_publicar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede publicar articulos'
      using errcode = 'insufficient_privilege';
  end if;
  update public.articulos
     set publicado = p_publicar,
         publicado_at = case when p_publicar then coalesce(publicado_at, now()) else publicado_at end,
         actualizado_at = now()
   where id = p_id
  returning titulo into t;
  if t is null then raise exception 'Ese articulo no existe'; end if;
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), case when p_publicar then 'articulo_publicar' else 'articulo_despublicar' end, null,
          jsonb_build_object('articulo', p_id, 'titulo', t));
end; $$;

-- Devuelve la ruta del PDF (si tenia) para que el panel lo borre del bucket:
-- borrar la fila de `storage.objects` con SQL no elimina el archivo.
create or replace function public.admin_articulo_borrar(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare ruta text; t text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar articulos'
      using errcode = 'insufficient_privilege';
  end if;
  delete from public.articulos where id = p_id returning pdf_path, titulo into ruta, t;
  if t is null then raise exception 'Ese articulo no existe'; end if;
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'articulo_borrar', null, jsonb_build_object('articulo', p_id, 'titulo', t));
  return ruta;
end; $$;

-- ---------- Bot de Telegram ----------
-- Lo que el bot LISTA: solo publicados y marcados `en_bot`, con el titulo
-- corto y neutro. Tope de 12 (el teclado en linea no da para mas). Ni cuerpo ni
-- PDF: el bot solo da el enlace al sitio.
create or replace function public.bot_articulos_lista()
returns table (id uuid, titulo text) language sql stable security definer set search_path = '' as $$
  select a.id, coalesce(a.titulo_bot, left(btrim(a.titulo), 60))
    from public.articulos a
   where a.publicado and a.en_bot
   order by a.orden, a.publicado_at desc
   limit 12;
$$;

-- ---------- PDF adjunto: bucket privado ----------
-- Una cuenta con sesion puede bajar el PDF SOLO de un articulo publicado; el
-- borrador solo lo ve quien administra. La politica pregunta a una funcion
-- porque `authenticated` no tiene permiso sobre la tabla.

create or replace function public.articulo_pdf_visible(p_ruta text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.articulos a where a.publicado and a.pdf_path = p_ruta);
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('articulos', 'articulos', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

create policy articulos_leer
  on storage.objects for select to authenticated
  using (bucket_id = 'articulos' and (public.es_admin() or public.articulo_pdf_visible(name)));
create policy articulos_subir
  on storage.objects for insert to authenticated
  with check (bucket_id = 'articulos' and public.es_admin());
create policy articulos_reemplazar
  on storage.objects for update to authenticated
  using (bucket_id = 'articulos' and public.es_admin());
create policy articulos_borrar
  on storage.objects for delete to authenticated
  using (bucket_id = 'articulos' and public.es_admin());

-- ---------- Permisos ----------
do $$
declare f text;
begin
  foreach f in array array[
    'articulos_publicados()', 'articulo_publicado(uuid)', 'articulo_pdf_visible(text)',
    'admin_articulos()',
    'admin_articulo_guardar(uuid, text, text, text, text, text, text, boolean, int)',
    'admin_articulo_publicar(uuid, boolean)', 'admin_articulo_borrar(uuid)',
    'bot_articulos_lista()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Con sesion (la propia funcion exige `auth.uid()`).
grant execute on function public.articulos_publicados()      to authenticated;
grant execute on function public.articulo_publicado(uuid)    to authenticated;
grant execute on function public.articulo_pdf_visible(text)  to authenticated;
-- Administracion: `authenticated`, pero cada funcion exige `es_admin()` adentro.
grant execute on function public.admin_articulos() to authenticated;
grant execute on function public.admin_articulo_guardar(uuid, text, text, text, text, text, text, boolean, int) to authenticated;
grant execute on function public.admin_articulo_publicar(uuid, boolean) to authenticated;
grant execute on function public.admin_articulo_borrar(uuid) to authenticated;
-- Bot: solo la llave de servicio.
grant execute on function public.bot_articulos_lista() to service_role;
