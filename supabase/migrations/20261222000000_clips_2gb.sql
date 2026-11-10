-- Videos de hasta 2 GB.
--
-- El bucket `clips` tenia `file_size_limit = 2000 * 1024 * 1024` (2000 MiB,
-- 20260823000000_clips.sql). La pantalla ya decia «hasta 2 GB», y 2 GB son 2048
-- MiB: un archivo de exactamente 2 GiB lo habria rechazado el bucket. Se alinea con
-- la constante del cliente (`MAX_VIDEO_BYTES`, src/lib/clips.ts).
--
-- Ojo con el tipo: `2048 * 1024 * 1024` en SQL se calcula como int4 y desborda
-- (2^31 no cabe en 32 bits: «entero fuera de rango»), por eso el `::bigint`.
--
-- Idempotente. NO toca ningun otro bucket (albumes, avatars, clip-covers,
-- clip-covers-full, verificacion, expedientes conservan su limite).
--
-- IMPORTANTE (se hace en el panel de Supabase, no aqui): el limite del bucket no
-- puede superar el GLOBAL de Storage (Storage -> Settings -> «Global file size
-- limit»). Si el global sigue en 50 MB, esta migracion no basta: hay que subirlo a
-- >= 2 GB (2048 MiB) ANTES de aplicarla, y eso requiere plan Pro.

update storage.buckets
   set file_size_limit = 2048::bigint * 1024 * 1024   -- bigint: 2048*1024*1024 = 2^31 desborda un int de 32 bits
 where id = 'clips';
