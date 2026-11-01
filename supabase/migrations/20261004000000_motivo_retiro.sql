-- Un retiro deja de ser un «ajuste de administración».
--
-- Al aprobar un retiro, el cargo al saldo se anotaba con motivo
-- 'ajuste_admin' y la nota 'Retiro aprobado'. En la pantalla de dinero de la
-- creadora eso sale como «Ajuste», que es exactamente lo que NO es: un ajuste
-- es una correccion manual de alguien de la plataforma, y un retiro es dinero
-- suyo que pidio y se le pago. Leerlo como ajuste da a entender que alguien le
-- quito saldo.
--
-- Va en dos migraciones y no en una: Postgres permite agregar un valor al
-- enum dentro de una transaccion, pero NO usarlo hasta que esa transaccion
-- termina. La siguiente lo usa.

alter type public.motivo_movimiento add value if not exists 'retiro';
