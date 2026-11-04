-- La portada, en dos tamaños y en dos buckets
--
-- Hasta hoy la portada se subia una sola vez, de 720 px, al bucket PUBLICO.
-- Eso convertia el catalogo en una galeria gratis: 186 clips de pago servian
-- su portada entera sin credenciales, y 183 servian ademas una tira de seis
-- fotogramas de 360x480. Unos 1.284 cuadros de contenido de pago, regalados.
--
-- El arreglo tiene dos piezas. La primera ya corrio sobre lo que habia
-- (scripts/portadas-achicar.mjs, 3 de noviembre de 2026). Esta migracion es
-- la segunda: deja escrito en el repositorio el bucket privado que ese script
-- creo con la llave de servicio, y le da a las creadoras permiso para
-- escribir en el, para que los clips NUEVOS nazcan ya con las dos copias.
--
-- La convencion que hay que respetar, y la razon de que nada de esto necesite
-- una columna nueva:
--
--   clip-covers       publico   la version de 32 px: mancha de color
--   clip-covers-full  privado   la original nitida, EN LA MISMA RUTA
--
-- `clips.cover_path` sirve para las dos. Cambiar el tamaño que se enseña es
-- cambiar de que bucket se lee, no buscar otra fila.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clip-covers-full', 'clip-covers-full', false, 5 * 1024 * 1024,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

comment on column public.clips.cover_path is
  'Ruta de la portada, valida en los DOS buckets: clip-covers (publico, 32 px) y clip-covers-full (privado, nitida). La primera carpeta es el id de quien subio, y sobre eso se apoya la seguridad de escritura.';

-- ── Permisos ────────────────────────────────────────────────────────────────
--
-- Misma convencion que clip-covers y que los avatares: la primera carpeta del
-- path es el id de quien sube. Lo que cambia es que aqui NO hay politica de
-- lectura publica, que es justamente el punto.

create policy nitida_escribir_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'clip-covers-full'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy nitida_actualizar_propio on storage.objects for update to authenticated
  using (bucket_id = 'clip-covers-full'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy nitida_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id = 'clip-covers-full'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Leer: su autora y un admin. A quien PAGA todavia no se le entrega la
-- nitida; cuando se haga sera con URL firmada de vida corta por el mismo
-- camino que el video —la funcion de borde `ver-clip`, que ve la IP real y
-- decide el geobloqueo antes de que exista una URL—, y no abriendo este
-- bucket. Una politica de lectura aqui seria una URL permanente.
create policy nitida_leer_propio on storage.objects for select to authenticated
  using (bucket_id = 'clip-covers-full'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.es_admin()));

-- Limpieza tras un intento fallido, igual que en los otros buckets: sin esto
-- un reintento choca contra los restos del anterior.
create policy nitida_admin_borra on storage.objects for delete to authenticated
  using (bucket_id = 'clip-covers-full' and public.es_admin());
