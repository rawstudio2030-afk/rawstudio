-- Administracion puede borrar los archivos de CUALQUIER cuenta.
--
-- Las politicas de borrado de administracion para los videos, las portadas y los
-- avatares exigian que la duenia del archivo tuviera un expediente, o sea, que
-- la hubiera dado de alta administracion (la politica se escribio para «publicar
-- por» alguien). En una cuenta que se registro sola, el borrado de sus archivos
-- NO se ejecutaba, y tampoco daba error: `storage.remove` solo devuelve menos
-- archivos. La purga de clips y «Eliminar definitivamente» decian que habian
-- borrado y los archivos seguian ahi.
--
-- Las portadas nitidas (`nitida_admin_borra`) y los albumes (`albumes_admin_borra`)
-- ya valian para cualquier cuenta; esto iguala los videos, las portadas publicas
-- y los avatares. Solo se amplia el BORRADO: subir y actualizar en nombre de otra
-- persona sigue limitado a cuentas con expediente.
--
-- El cliente, ademas, ahora VERIFICA que el archivo desaparecio (src/lib/archivos.ts).

alter policy clips_archivo_admin_borra on storage.objects
  using (bucket_id = any (array['clips', 'clip-covers']) and public.es_admin());

alter policy avatars_admin_borra on storage.objects
  using (bucket_id = 'avatars' and public.es_admin());

-- ---------- Y para borrar hay que poder VER ----------
--
-- Postgres exige que la fila sea visible por alguna politica de LECTURA para
-- poder borrarla (el borrado de storage hace `delete ... where name = ...`). La
-- lectura de los videos y los albumes pasa por `tiene_acceso`, que para un clip
-- BORRADO devuelve falso incluso para administracion. O sea: justo cuando un clip
-- llega a la purga (borrado, con sus archivos esperando), administracion no veia
-- sus archivos y el borrado fallaba en silencio. Esto le da lectura a
-- administracion sobre esos buckets privados, que es lo que hace falta para
-- purgar; ya podia ver todos los clips que NO estan borrados.
create policy archivos_admin_ve on storage.objects for select to authenticated
  using (bucket_id in ('clips', 'clip-covers-full', 'albumes') and public.es_admin());
