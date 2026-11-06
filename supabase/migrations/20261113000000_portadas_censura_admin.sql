-- Que administracion pueda censurar las portadas que ya estaban.
--
-- ---------- Lo que hay ----------
--
-- Desde el 3 de noviembre cada portada vive en dos buckets con la misma ruta:
-- la de 32 px en `clip-covers` (publico) y la nitida en `clip-covers-full`
-- (privado, firmada solo para quien compro). Las subidas nuevas ya salen asi.
--
-- Pero 187 clips se publicaron ANTES, y su unica copia es una de 160 px en el
-- bucket publico: lo bastante nitida para verlo todo en una tarjeta de 164.
-- Es lo que se ve hoy en el catalogo, y es lo que hay que encoger.
--
-- ---------- Lo que falta ----------
--
-- La pasada que las encoge corre desde el panel, con la sesion de quien
-- administra, y necesita dos cosas que las politicas no le daban:
--
--   1. ESCRIBIR en `clip-covers-full`. Solo su dueña podia (folder = uid).
--      Hace falta para guardar ahi la de 160 antes de encoger la publica: es
--      la mejor copia que existe de esos clips y quien compro tiene que
--      seguir viendola.
--   2. SOBRESCRIBIR en `clip-covers` cualquier carpeta. La politica de
--      actualizar exigia que la dueña tuviera expediente —estaba pensada
--      para subir POR una creadora dada de alta—, y seis de las creadoras con
--      clips se registraron solas y no lo tienen.
--
-- Las dos se conceden solo a es_admin() y solo a esos dos buckets. El de los
-- videos no se toca.

create policy nitida_admin_sube on storage.objects for insert to authenticated
  with check (bucket_id = 'clip-covers-full' and public.es_admin());

create policy nitida_admin_actualiza on storage.objects for update to authenticated
  using (bucket_id = 'clip-covers-full' and public.es_admin());

create policy covers_admin_censura on storage.objects for update to authenticated
  using (bucket_id = 'clip-covers' and public.es_admin());
