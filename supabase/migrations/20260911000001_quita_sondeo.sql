-- Retira la funcion temporal que se uso para averiguar de que cabecera sale la
-- IP real. Devolvia las cabeceras de la peticion a quien llamara, incluida
-- anon. No es una fuga grave —cada quien veia solo las suyas— pero no tiene
-- nada que hacer en produccion.
--
-- Se cuela aqui porque el archivo de la migracion de sondeo se quedo en la
-- carpeta y una segunda pasada de db push volvio a crearla despues de que la
-- migracion de bitacora ya la habia borrado.
drop function if exists public._probe_cabeceras();
