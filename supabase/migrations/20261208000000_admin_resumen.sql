-- Panel de administracion: lo que necesita la portada «Resumen» y su menu.
--
-- 1) `admin_conteo_retiros`: cuantos retiros hay por estado, al estilo de
--    `admin_conteo_moderacion`, `admin_conteo_verificaciones` y
--    `admin_conteo_reportes`. El badge del menu y la tarjeta del Resumen cuentan
--    TODOS los retiros de cada estado, no solo la pagina visible de una lista.
--
-- 2) `admin_finanzas_serie_rango`: la serie diaria de operaciones para un RANGO.
--    La grafica de Finanzas siempre pedia «los ultimos 30 dias» aunque el filtro
--    Desde/Hasta cambiara las cifras de al lado. Los dias sin movimiento salen en
--    cero (es lo que paso, no un punto inventado). Como las cifras de `admin_finanzas`,
--    respeta los limites como instantes (`created_at` entre `desde_` y `hasta_`);
--    los dias son dias UTC, igual que `admin_finanzas_serie`. Tope: 366 dias.
--    Sin limites, son los ultimos 30 dias.

create or replace function public.admin_conteo_retiros()
returns table (estado text, cuantos bigint)
language sql stable security definer set search_path = '' as $$
  select s.estado::text, count(*) from public.solicitudes_retiro s
   where public.es_admin() group by s.estado;
$$;
revoke all on function public.admin_conteo_retiros() from public, anon;
grant execute on function public.admin_conteo_retiros() to authenticated;

create or replace function public.admin_finanzas_serie_rango(
  desde_ timestamptz default null, hasta_ timestamptz default null
) returns table (dia date, operaciones bigint, coins bigint)
language sql stable security definer set search_path = '' as $$
  with lim as (
    select coalesce(hasta_::date, current_date) as fin,
           coalesce(desde_::date, coalesce(hasta_::date, current_date) - 29) as ini
  ),
  d as (
    select generate_series(greatest(l.ini, l.fin - 365), l.fin, '1 day')::date as dia from lim l
  ),
  todo as (
    select p.created_at, p.price_coins as coins from public.purchases p
    union all select t.created_at, t.price_coins from public.rentals t
    union all select i.created_at, i.coins       from public.tips i
    union all select m.created_at, m.price_coins from public.message_unlocks m
    union all select s.created_at, s.price_coins from public.show_tickets s
  )
  select d.dia, count(t.*)::bigint, coalesce(sum(t.coins), 0)::bigint
    from d left join todo t
      on t.created_at::date = d.dia
     and (desde_ is null or t.created_at >= desde_)
     and (hasta_ is null or t.created_at <= hasta_)
   where public.es_admin()
   group by d.dia order by d.dia;
$$;
revoke all on function public.admin_finanzas_serie_rango(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finanzas_serie_rango(timestamptz, timestamptz) to authenticated;
