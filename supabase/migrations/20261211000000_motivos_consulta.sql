-- Motivos del libro para las consultas de pago por Telegram.
--
-- Solo agrega los dos valores. `alter type ... add value` no deja USAR el valor
-- nuevo en la misma transaccion en que se crea, asi que todo lo que los usa va en
-- la migracion siguiente (20261211000001_cobro_consultas.sql), igual que se hizo
-- con 'retiro' (20261004000000 y 20261004000001).
--
--   consulta        el cargo al cliente por un mensaje (delta negativo)
--   venta_consulta  lo que recibe la creadora al responder (delta positivo, ya
--                   sin la comision de la plataforma)
--
-- NO se reutilizan 'compra_clip' ni 'venta_clip': una consulta no desbloquea un
-- clip, y mezclarlas falsearia «lo ganado por ventas». La devolucion usa el motivo
-- 'reembolso' que ya existia.

alter type public.motivo_movimiento add value if not exists 'consulta';
alter type public.motivo_movimiento add value if not exists 'venta_consulta';
