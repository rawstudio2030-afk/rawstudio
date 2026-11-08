-- Subida en lote: el catalogo no vuelve a llenarse de 2.40.
--
-- 1) DEFAULT de `clips.price_coins`: 240 -> 2000 (20 dolares, el mismo arranque del
--    formulario de publicar). Casi todos los 2.40 (184 de 189) venian de la subida en
--    lote, que fijaba 240 en el cliente (ya corregido: ahora asigna 10, 20 o 40 al
--    azar por video). Esto solo evita que CUALQUIER otra insercion que omita el precio
--    caiga otra vez en 2.40. Cambiar un DEFAULT NO reescribe filas existentes: solo
--    cuenta para inserciones futuras.
--    NO toca el precio fijo de los albumes (vive en `ajustes`, no en esta columna).
--
-- 2) El mismo UPDATE idempotente de 20261214000000_precios_10_20_40.sql, por si entre
--    esa migracion y el arreglo del cliente se subio algun video de pago que quedo en
--    240. El `where` exige 240 y el resultado nunca es 240, asi que correrlo otra vez
--    no cambia nada. No toca albumes, clips gratis, videos con otro precio, ni
--    `renta_coins` / `renta_horas`.

alter table public.clips alter column price_coins set default 2000;

update public.clips
   set price_coins = (array[1000, 2000, 4000])[1 + floor(random() * 3)::int]
 where visibility = 'pago'
   and coalesce(formato, 'video') = 'video'
   and price_coins = 240;
