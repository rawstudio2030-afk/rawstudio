-- Modulo 5: finanzas.
--
-- DOS MONEDAS, Y NO SE SUMAN. La plataforma mueve dos cosas distintas:
--
--   coins  -> economia interna: clips, rentas, propinas, chat, encargos.
--   pesos  -> dinero real que entra por payment_orders y sale por payouts.
--
-- El puente entre ambas es la recarga, y NADIE HA DEFINIDO SU TIPO DE CAMBIO
-- porque todavia no hay procesador de pagos. Por eso este modulo informa los
-- coins como coins: convertirlos a pesos exigiria un numero que no existe, y
-- ponerlo a ojo seria inventar los ingresos.

-- ---------- La comision, en un solo lugar ----------

-- Estaba escrita a mano en dos migraciones distintas (comprar_clip y
-- dar_propina). Dos copias del mismo trato es una que se queda atras el dia
-- que cambie: si manana el reparto fuera 85/15, una de las dos seguiria
-- cobrando 20% sin que nadie lo notara.
insert into public.ajustes (clave, valor, nota) values
  ('comision_pct', '20'::jsonb,
   'Porcentaje que retiene la plataforma sobre cada venta, renta, propina y desbloqueo. La pagina para creadoras promete que se quedan el 80%.')
on conflict (clave) do nothing;

create or replace function public.comision_pct()
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select (valor)::text::numeric from public.ajustes where clave='comision_pct'), 20);
$$;

create or replace function public.comision_de(cantidad int)
returns int language sql stable security definer set search_path = '' as $$
  select round(cantidad * public.comision_pct() / 100.0)::int;
$$;

-- ---------- Resumen por fuente ----------

create or replace function public.admin_finanzas(
  desde_ timestamptz default null, hasta_ timestamptz default null
)
returns table (
  fuente text, operaciones bigint, bruto_coins bigint,
  comision_coins bigint, para_creadoras bigint
)
language sql security definer stable set search_path = '' as $$
  with rango as (
    select coalesce(desde_, '-infinity'::timestamptz) as d,
           coalesce(hasta_,  'infinity'::timestamptz) as h
  ),
  -- Cada canal aporta sus filas con la misma forma. La comision se recalcula
  -- aqui en vez de leerse del libro para que el reparto sea comparable entre
  -- canales aunque el porcentaje haya cambiado con el tiempo.
  todo as (
    select 'venta_clip' as fuente, p.price_coins as coins
      from public.purchases p, rango r where p.created_at between r.d and r.h
    union all
    select 'renta', t.price_coins
      from public.rentals t, rango r where t.created_at between r.d and r.h
    union all
    select 'propina', i.coins
      from public.tips i, rango r where i.created_at between r.d and r.h
    union all
    select 'chat', m.price_coins
      from public.message_unlocks m, rango r where m.created_at between r.d and r.h
    union all
    select 'encargo', coalesce(e.acordado_coins, e.oferta_coins)
      from public.custom_requests e, rango r
     where e.created_at between r.d and r.h and e.estado in ('pagado','entregado')
    union all
    select 'entrada_show', s.price_coins
      from public.show_tickets s, rango r where s.created_at between r.d and r.h
  )
  select t.fuente, count(*)::bigint, sum(t.coins)::bigint,
         sum(public.comision_de(t.coins))::bigint,
         sum(t.coins - public.comision_de(t.coins))::bigint
    from todo t
   where public.es_admin()
   group by t.fuente
   order by sum(t.coins) desc;
$$;
revoke all on function public.admin_finanzas(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finanzas(timestamptz, timestamptz) to authenticated;

-- ---------- Dinero real ----------

create or replace function public.admin_dinero_real(
  desde_ timestamptz default null, hasta_ timestamptz default null
)
returns table (
  ordenes_pagadas bigint, entrado_mxn bigint,
  ordenes_pendientes bigint, pendiente_mxn bigint,
  dispersado_mxn bigint, isr_mxn bigint, iva_ret_mxn bigint
)
language sql security definer stable set search_path = '' as $$
  select
    (select count(*) from public.payment_orders o
      where o.estado='pagado' and o.pagado_at between coalesce(desde_,'-infinity') and coalesce(hasta_,'infinity')),
    coalesce((select sum(o.monto_mxn) from public.payment_orders o
      where o.estado='pagado' and o.pagado_at between coalesce(desde_,'-infinity') and coalesce(hasta_,'infinity')),0),
    (select count(*) from public.payment_orders o where o.estado='pendiente'),
    coalesce((select sum(o.monto_mxn) from public.payment_orders o where o.estado='pendiente'),0),
    coalesce((select sum(p.neto_mxn) from public.payouts p where p.estado in ('enviada','pagada')),0),
    coalesce((select sum(p.isr_mxn)  from public.payouts p where p.estado in ('enviada','pagada')),0),
    coalesce((select sum(p.iva_ret_mxn) from public.payouts p where p.estado in ('enviada','pagada')),0)
  where public.es_admin();
$$;
revoke all on function public.admin_dinero_real(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dinero_real(timestamptz, timestamptz) to authenticated;

-- ---------- Serie temporal ----------

create or replace function public.admin_finanzas_serie(
  dias int default 30
)
returns table (dia date, operaciones bigint, coins bigint)
language sql security definer stable set search_path = '' as $$
  with d as (
    select generate_series(
      (current_date - (greatest(1, least(dias, 365)) - 1))::date,
      current_date, '1 day')::date as dia
  ),
  todo as (
    select p.created_at, p.price_coins as coins from public.purchases p
    union all select t.created_at, t.price_coins from public.rentals t
    union all select i.created_at, i.coins       from public.tips i
    union all select m.created_at, m.price_coins from public.message_unlocks m
    union all select s.created_at, s.price_coins from public.show_tickets s
  )
  select d.dia,
         count(t.*)::bigint,
         coalesce(sum(t.coins),0)::bigint
    from d left join todo t on t.created_at::date = d.dia
   where public.es_admin()
   group by d.dia order by d.dia;
$$;
revoke all on function public.admin_finanzas_serie(int) from public, anon;
grant execute on function public.admin_finanzas_serie(int) to authenticated;

-- ---------- Ranking de creadoras ----------

create or replace function public.admin_ranking_creadoras(
  desde_ timestamptz default null, hasta_ timestamptz default null, limite int default 20
)
returns table (
  id uuid, handle text, nombre text, ganado bigint,
  ventas bigint, propinas bigint, clips_publicados bigint
)
language sql security definer stable set search_path = '' as $$
  select p.id, p.handle, p.display_name,
         coalesce(sum(l.delta),0)::bigint,
         count(*) filter (where l.motivo='venta_clip')::bigint,
         count(*) filter (where l.motivo='propina')::bigint,
         (select count(*) from public.clips c
           where c.creator_id = p.id and c.estado='aprobado')::bigint
    from public.profiles p
    join public.coin_ledger l on l.user_id = p.id
   where public.es_admin()
     and l.delta > 0 and l.motivo in ('venta_clip','propina')
     and l.created_at between coalesce(desde_,'-infinity') and coalesce(hasta_,'infinity')
   group by p.id, p.handle, p.display_name
   order by sum(l.delta) desc
   limit greatest(1, least(limite, 100));
$$;
revoke all on function public.admin_ranking_creadoras(timestamptz, timestamptz, int) from public, anon;
grant execute on function public.admin_ranking_creadoras(timestamptz, timestamptz, int) to authenticated;
