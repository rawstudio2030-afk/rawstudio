-- Clips: el catalogo y sus archivos.
--
-- Separacion deliberada en dos buckets:
--   clip-covers  publico  — la portada es el anzuelo, tiene que verse sin pagar
--   clips        PRIVADO  — el video es el producto; jamas lectura publica
--
-- Es la traduccion tecnica de "pay to see it": si el bucket del video fuera
-- publico, bastaria adivinar la URL para saltarse el paywall entero.

create type public.visibilidad_clip as enum ('pago', 'suscriptores', 'gratis');

create table public.clips (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles (id) on delete cascade,

  title        text not null check (char_length(title) between 1 and 90),
  description  text check (char_length(description) <= 600),

  storage_path text,                    -- ruta en el bucket privado 'clips'
  cover_path   text,                    -- ruta en el bucket publico 'clip-covers'
  duration_s   int check (duration_s is null or duration_s > 0),

  visibility   public.visibilidad_clip not null default 'pago',
  price_coins  int not null default 240 check (price_coins >= 0),

  -- Un clip nace sin publicar: subir y publicar son actos distintos. Asi nadie
  -- expone por accidente algo que apenas estaba acomodando.
  published    boolean not null default false,
  published_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index clips_creador_idx  on public.clips (creator_id, created_at desc);
create index clips_publicos_idx on public.clips (published_at desc) where published;

alter table public.clips enable row level security;

-- Lectura: los publicados los ve cualquiera; los borradores, solo su autora.
-- Esto expone METADATOS (titulo, precio, portada), nunca el archivo de video:
-- ese vive en un bucket privado con sus propias politicas.
create policy clips_select_publicados
  on public.clips for select
  using (published or creator_id = auth.uid() or public.es_admin());

-- Escritura: solo lo propio, y solo si el perfil esta marcado como creadora.
create policy clips_insert_propio
  on public.clips for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_creator and p.suspended_at is null
    )
  );

create policy clips_update_propio
  on public.clips for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy clips_delete_propio
  on public.clips for delete
  to authenticated
  using (creator_id = auth.uid());

-- Un admin necesita poder retirar material: es el caso que justifica todo el
-- rol de administracion.
create policy clips_update_admin
  on public.clips for update
  to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy clips_delete_admin
  on public.clips for delete
  to authenticated
  using (public.es_admin());

-- El autor no se reescribe, y published_at se deriva solo del acto de publicar.
create or replace function public.clips_blindar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.creator_id := old.creator_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.published and not old.published then
    new.published_at := now();
  elsif not new.published then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger clips_blindar before update on public.clips
  for each row execute function public.clips_blindar();

create or replace function public.clips_publicar_alta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published then new.published_at := now(); end if;
  return new;
end;
$$;

create trigger clips_publicar_alta before insert on public.clips
  for each row execute function public.clips_publicar_alta();

-- ── Almacenamiento ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clip-covers', 'clip-covers', true,  5 * 1024 * 1024,
   array['image/jpeg','image/png','image/webp']),
  ('clips',       'clips',       false, 2000 * 1024 * 1024,
   array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Misma convencion que los avatares: la primera carpeta del path es el id de
-- quien sube, y sobre eso se apoya toda la seguridad de escritura.
create policy covers_lectura_publica on storage.objects for select
  using (bucket_id = 'clip-covers');
create policy covers_escribir_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'clip-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy covers_actualizar_propio on storage.objects for update to authenticated
  using (bucket_id = 'clip-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy covers_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id = 'clip-covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- El video: por ahora SOLO su autora y un admin pueden leerlo. Cuando existan
-- las compras, aqui se agrega la condicion de "quien pago"; el bucket sigue
-- privado y el acceso se dara con URLs firmadas de vida corta.
create policy clips_archivo_leer_propio on storage.objects for select to authenticated
  using (
    bucket_id = 'clips'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin())
  );
create policy clips_archivo_subir_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clips_archivo_actualizar_propio on storage.objects for update to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clips_archivo_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
