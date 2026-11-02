-- Quedaron DOS `admin_alta_creadora`, y la vieja sigue inventando correos.
--
-- `create or replace function` solo reemplaza cuando la firma es identica. Al
-- agregarle p_email y p_telefono, la firma cambio y Postgres creo una funcion
-- NUEVA al lado de la de cinco parametros, que sigue existiendo, sigue
-- concedida a authenticated, y sigue poniendo handle@alta.rawstudio.biz.
--
-- Se vio al comprobar la migracion anterior: una llamada con solo los
-- parametros comunes responde PGRST203 «could not choose the best candidate
-- function», que es PostgREST diciendo que hay dos y no sabe cual.
--
-- Hoy no la llama nadie —el cliente manda siempre los siete— pero una funcion
-- viva que se salta la regla que acabamos de poner no se deja ahi esperando a
-- que alguien la encuentre.

drop function if exists public.admin_alta_creadora(text, text, text, date, text);
