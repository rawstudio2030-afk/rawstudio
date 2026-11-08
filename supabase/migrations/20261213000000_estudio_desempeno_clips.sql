-- Estudio: lo que dejo cada publicacion.
--
-- «Has ganado» es un solo numero. Esta funcion lo desglosa POR CLIP, para que una
-- creadora vea cuales publicaciones le han dejado dinero y cuales no.
--
-- LO QUE ES Y LO QUE NO ES UN INGRESO «DE UN CLIP»
--   `venta_clip` NO significa «venta de un clip»: el mismo motivo sirve para el
--   desbloqueo y la renta (`ref_id` = el clip), pero tambien para una suscripcion
--   (`ref_id` = el nivel) y un encargo entregado (`ref_id` = el encargo). Por eso
--   aqui solo se une un movimiento cuando su `ref_id` es el id de un clip SUYO: una
--   suscripcion o un encargo nunca aparecen como si fueran un clip, y siguen
--   contando en «Has ganado».
--   Las propinas de un clip guardan ese clip como `ref_id`; las del perfil van sin
--   `ref_id` y no se cuelgan de ningun clip.
--   `venta_consulta.ref_id` es el MENSAJE; el clip esta en el hilo
--   (`consultas.clip_id`). `consulta_mensajes` no se puede leer desde el navegador,
--   asi que el cruce se hace aqui.
--
-- TODO EN CENTAVOS DE DOLAR, lo que LLEGO a la cuenta (ya sin la comision).
--
-- PRIVACIDAD. Solo devuelve clips con `creator_id = auth.uid()`: nadie, ni un admin
-- que no sea la duena, ve por aqui los clips ni las cifras de otra cuenta. No
-- devuelve compradores, user_id ajenos, chat_id, telefonos, cuerpos de mensaje ni
-- datos de Telegram: solo conteos y sumas.
--
-- QUE FILAS. Un clip propio por fila (video o album), publicado o no, para ver
-- tambien los que aun no salen. NO se inventan filas a partir de un `ref_id` que ya
-- no tiene clip: ese dinero sigue en «Has ganado». Quedan fuera los clips que ella
-- misma borro (`borrado_at`) y los albumes que aun se estan subiendo (incompletos).
-- `desbloqueos` cuenta solo compras con precio: la fila de precio 0 que se crea al
-- ENTREGAR un encargo es una entrega, no un desbloqueo pagado.

create or replace function public.estudio_desempeno_clips()
returns table (
  id uuid, title text, cover_path text, formato text, published boolean, price_coins int,
  desbloqueos bigint, rentas bigint,
  ganado_ventas bigint, ganado_propinas bigint, ganado_consultas bigint,
  consultas_pagadas bigint, ganado_total bigint
) language sql stable security definer set search_path = '' as $$
  with mios as (
    select c.id, c.title, c.cover_path, c.formato, c.published, c.price_coins, c.created_at
      from public.clips c
     where c.creator_id = auth.uid()
       and c.borrado_at is null
       and (c.formato = 'video' or c.completo)
  ),
  ventas as (
    select l.ref_id as clip, sum(l.delta)::bigint as total
      from public.coin_ledger l
     where l.user_id = auth.uid() and l.motivo = 'venta_clip' and l.delta > 0
       and l.ref_id in (select m.id from mios m)
     group by l.ref_id
  ),
  propinas as (
    select l.ref_id as clip, sum(l.delta)::bigint as total
      from public.coin_ledger l
     where l.user_id = auth.uid() and l.motivo = 'propina' and l.delta > 0
       and l.ref_id in (select m.id from mios m)
     group by l.ref_id
  ),
  consultas as (
    select q.clip_id as clip, sum(l.delta)::bigint as total, count(*)::bigint as n
      from public.coin_ledger l
      join public.consulta_mensajes cm on cm.id = l.ref_id
      join public.consultas q on q.id = cm.consulta_id
     where l.user_id = auth.uid() and l.motivo = 'venta_consulta' and l.delta > 0
       and q.creadora_id = auth.uid()
       and q.clip_id in (select m.id from mios m)
     group by q.clip_id
  )
  select m.id, m.title, m.cover_path, m.formato, m.published, m.price_coins,
         (select count(*) from public.purchases p where p.clip_id = m.id and p.price_coins > 0),
         (select count(*) from public.rentals r where r.clip_id = m.id),
         coalesce(v.total, 0), coalesce(pr.total, 0), coalesce(co.total, 0),
         coalesce(co.n, 0),
         coalesce(v.total, 0) + coalesce(pr.total, 0) + coalesce(co.total, 0)
    from mios m
    left join ventas v   on v.clip = m.id
    left join propinas pr on pr.clip = m.id
    left join consultas co on co.clip = m.id
   where auth.uid() is not null
   order by 13 desc, m.created_at desc;
$$;
revoke all on function public.estudio_desempeno_clips() from public, anon;
grant execute on function public.estudio_desempeno_clips() to authenticated;
