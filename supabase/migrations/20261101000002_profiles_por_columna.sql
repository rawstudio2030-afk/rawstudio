-- `profiles` dejaba leer de mas, y una de esas columnas era un oraculo.
--
-- La tabla es de lectura publica a proposito: es el directorio de creadoras.
-- Pero la politica de RLS decide FILAS, no columnas, asi que con la llave
-- anonima salian las veintiuna, incluidas estas:
--
--   curp_hash        El hash no deja leer una CURP. Pero una CURP SE DERIVA
--                    de nombre + fecha de nacimiento + estado + sexo: si
--                    sabes quien es alguien, la calculas, la hasheas y
--                    comparas. Eso convierte la columna en un oraculo para
--                    «¿fulanita publica aqui?», que es exactamente la
--                    pregunta que este sitio existe para no responder. Y va
--                    sin sal, asi que el hash es el mismo que produciria
--                    cualquier otro sitio con el mismo metodo.
--   documento_hash   Lo mismo con el documento de identidad.
--   suspended_reason, suspendido_hasta, baneado_motivo
--                    Notas de moderacion sobre una persona, en publico.
--
-- Ninguna de las cinco se lee desde el cliente —se comprobo una por una—, asi
-- que quitarlas no rompe nada. Las de moderacion las sigue viendo el panel,
-- que las pide por `admin_listar_usuarios`: es security definer y por eso no
-- le afectan estos permisos.
--
-- Esto es permiso por COLUMNA, que es la herramienta que faltaba. La RLS ya
-- hacia bien su parte: se probaron las 37 tablas con la llave anonima y solo
-- devuelven filas las tres publicas.

revoke select on public.profiles from anon, authenticated;

-- Lo que ve cualquiera: el directorio.
--
-- `baneado_at` entra aunque no se enseñe: el directorio filtra por ella para
-- no listar cuentas baneadas, y Postgres exige permiso de lectura tambien
-- sobre las columnas que aparecen en un WHERE.
grant select (
  id, handle, display_name, bio, avatar_path,
  is_creator, verified, es_demo, identidad_verificada,
  created_at, baneado_at
) on public.profiles to anon;

-- Quien entro ve ademas lo suyo. Siguen siendo columnas sobre su propio
-- estado en el sitio, no datos personales.
grant select (
  id, handle, display_name, bio, avatar_path,
  is_creator, verified, es_demo, identidad_verificada,
  created_at, baneado_at,
  adult_confirmed_at, suspended_at, paises_bloqueados
) on public.profiles to authenticated;
