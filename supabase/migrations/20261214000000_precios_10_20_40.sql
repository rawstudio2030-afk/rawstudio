-- Precios de venta de 10, 20 o 40 dolares para los videos que seguian en 2.40.
--
-- El 2.40 era el VALOR INICIAL del formulario de publicar (240 centavos), no una
-- decision de cada creadora: la mayoria de los videos se quedaron ahi. Sergio pidio
-- que esos videos pasen, AL AZAR, a 10, 20 o 40 dolares (1000, 2000 o 4000 centavos).
--
-- QUE SE TOCA: videos de pago (`visibility = 'pago'`, `formato` video o nulo) cuyo
-- precio es exactamente 240.
-- QUE NO: albumes (`formato = 'album'`, tienen su precio fijo), clips gratis (precio 0
-- u otra visibilidad) y cualquier video cuyo precio NO sea 240 (eso si lo movio
-- alguien a mano). Tampoco `renta_coins` ni `renta_horas`.
--
-- IDEMPOTENTE: el `where` exige 240 y el resultado nunca es 240, asi que correrla otra
-- vez no cambia ninguna fila ni vuelve a revolver los que ya salieron. `random()` es
-- volatil y se evalua POR FILA: no es un mismo numero para todas.
--
-- Quien ya desbloqueo un clip a 2.40 no se recobra ni pierde el acceso (`purchases` es
-- unico por usuario y clip y guarda lo que pago). Solo cambia lo que paga quien
-- desbloquee a partir de ahora.

update public.clips
   set price_coins = (array[1000, 2000, 4000])[1 + floor(random() * 3)::int]
 where visibility = 'pago'
   and coalesce(formato, 'video') = 'video'
   and price_coins = 240;
