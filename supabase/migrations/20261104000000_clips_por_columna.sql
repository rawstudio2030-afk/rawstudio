-- `clips` dejaba leer de mas: notas de moderacion y rutas internas en publico.
--
-- La tabla es de lectura publica a proposito —es el catalogo— pero la politica
-- de RLS decide FILAS, no columnas. Con la llave anonima, que viaja dentro del
-- bundle, salian las treinta y una. Entre ellas:
--
--   motivo_rechazo    Por que se rechazo un clip. Es una nota de moderacion
--                     sobre el trabajo de una persona, en publico.
--   revisado_por      Que administrador lo reviso. Ata la identidad de quien
--                     modera a contenido concreto, y eso no le hace falta a
--                     nadie fuera del panel.
--   borrado_por, borrado_motivo, purgar_despues_de
--                     Las tripas del borrado. `borrado_motivo` del unico clip
--                     borrado decia «error»; podria haber dicho cualquier otra
--                     cosa sobre esa persona.
--   storage_path      La ruta del video en el bucket privado. No da acceso
--                     —el bucket niega sin credenciales— pero publica la
--                     estructura de carpetas y el nombre de cada archivo.
--   paises_bloqueados Que paises bloquea ese clip. El geobloqueo lo decide
--                     `bloqueado_en`, que es security definer, asi que cerrar
--                     la columna no lo toca.
--
-- Es el mismo arreglo que se le hizo a `profiles` el 2 de noviembre de 2026
-- (20261101000002_profiles_por_columna): permiso por COLUMNA, que es la
-- herramienta que RLS no da. Y la misma trampa: el permiso de lectura de una
-- columna gobierna tambien el WHERE y el ORDER BY, asi que `destacado_orden`
-- entra en la lista publica aunque no se enseñe —el catalogo ordena por ella—.
--
-- Se comprobo una por una donde las lee el cliente. El panel va casi todo por
-- RPC security definer, a los que estos permisos no afectan, pero `clipsAdmin`
-- consulta la tabla directamente a proposito (para no repetir la regla de
-- lectura en un segundo sitio desde donde pudiera desincronizarse), y la
-- funcion de borde `ver-clip` lee `storage_path` CON EL TOKEN DE QUIEN LLAMA,
-- tambien a proposito. Por eso esas columnas se conservan para
-- `authenticated`: ahi no revelan nada, porque los valores sensibles solo
-- existen en filas —clips rechazados o borrados— que RLS ya esconde de quien
-- no las puso.

-- ── El hecho, no la ruta ────────────────────────────────────────────────────
--
-- La pantalla del clip solo usaba `storage_path` para una cosa: saber si hay
-- video, y decidir si vale la pena pedir la URL firmada. No necesitaba la
-- ruta, necesitaba el si o el no. Asi que se le da el si o el no.
--
-- Generada y almacenada: no hay disparador que mantener ni forma de que se
-- desincronice de la columna de la que sale.
alter table public.clips
  add column if not exists tiene_video boolean
  generated always as (storage_path is not null) stored;

comment on column public.clips.tiene_video is
  'Si el clip tiene archivo de video. Existe para que el cliente pueda saberlo sin leer storage_path, que es la ruta dentro del bucket privado.';

-- ── Permisos por columna ────────────────────────────────────────────────────

revoke select on public.clips from anon, authenticated;

-- Lo que ve cualquiera: el catalogo.
--
-- `destacado_orden` y `caduca_at` entran porque el catalogo filtra y ordena
-- por ellas. `published` y `published_at`, lo mismo.
grant select (
  id, creator_id, title, description,
  cover_path, preview_path, tiene_video,
  duration_s, visibility, price_coins, renta_horas, renta_coins,
  published, published_at, created_at,
  es_demo, tipo, caduca_at, caduca_modo, destacado_orden
) on public.clips to anon;

-- Quien entro ve ademas lo que necesitan tres sitios concretos:
--
--   storage_path      `ver-clip`, para firmar la URL del video, y `clipsAdmin`
--   estado            `MisClips`, para decirle a la creadora en que va su clip
--   motivo_rechazo    `MisClips`, para decirle por que se rechazo
--   borrado_*         `clipsAdmin`, que filtra y ordena por `borrado_at`
--   purgar_despues_de `clipsAdmin`, la lista de purga pendiente
--
-- Ninguna filtra nada nuevo: en un clip publicado valen null, y los valores
-- de verdad viven en filas que RLS solo muestra a su autora y a la
-- administracion.
grant select (
  id, creator_id, title, description,
  cover_path, preview_path, tiene_video,
  duration_s, visibility, price_coins, renta_horas, renta_coins,
  published, published_at, created_at,
  es_demo, tipo, caduca_at, caduca_modo, destacado_orden,
  storage_path, estado, motivo_rechazo,
  borrado_at, borrado_motivo, purgar_despues_de
) on public.clips to authenticated;

-- Fuera de las dos listas, y por tanto solo accesibles con service_role o
-- desde una funcion security definer: revisado_por, revisado_at, borrado_por,
-- destacado_desde, paises_bloqueados y updated_at. Se busco cada una en
-- src/ y en supabase/functions/: ninguna se lee desde el cliente.
