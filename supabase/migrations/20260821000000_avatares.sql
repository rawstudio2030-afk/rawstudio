-- Almacenamiento de fotos de perfil.
--
-- Mismo principio que las tablas: el bucket nace con sus politicas. Storage en
-- Supabase es una tabla (storage.objects) con RLS, asi que aplica lo mismo —la
-- anon key es publica y RLS es lo unico que separa mis archivos de los ajenos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars',
  true,                      -- lectura publica: las fotos de perfil se ven sin sesion
  2 * 1024 * 1024,           -- 2 MB: es una foto de perfil, no una galeria
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- Convencion de rutas: <uid>/<lo-que-sea>. Toda la seguridad de escritura se
-- apoya en que la primera carpeta del path sea el id de quien sube.
create policy avatars_lectura_publica
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_subir_propio
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_reemplazar_propio
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_borrar_propio
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
