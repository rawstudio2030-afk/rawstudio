-- El panel suma los ingresos de las consultas pagadas por Telegram.
--
-- Cuando se encendio el cobro (20261211000001) el panel no lo veia: Finanzas, el
-- ranking y «total ganado» de Usuarios listan a mano los motivos `venta_clip` y
-- `propina`, y no incluian `venta_consulta`. La comision y el reparto de las
-- consultas no aparecian en ninguna cifra.
--
-- QUE CUENTA COMO INGRESO
--   * Un mensaje de consulta cobrado y RESPONDIDO a tiempo: ahi se libero lo
--     retenido, la plataforma se quedo la comision y a la creadora se le abono el
--     resto. Es el unico momento en que hay un ingreso.
--   * NO cuenta el cargo `consulta` del cliente (es dinero retenido, no ingreso: si
--     no hay respuesta se devuelve), ni el `reembolso` (es un movimiento de cuenta,
--     no una venta), ni un mensaje vencido o anulado, ni uno anterior al cobro
--     (`cobro_coins = 0`).
--
-- COMO SE CALCULA EN FINANZAS. Igual que el resto de canales de `admin_finanzas`:
-- el bruto es lo que pago el cliente (`cobro_coins`) y la comision se RECALCULA con
-- `comision_de()` para que sea comparable entre canales. La fecha es la de la
-- respuesta (`respondido_at`), que es cuando se gano.
--
-- RANKING Y «TOTAL GANADO» salen del libro (`coin_ledger`), asi que basta con
-- incluir el motivo `venta_consulta`: lo que se le abono a la creadora (ya sin la
-- comision). No se agregan columnas: «ganado» incluye las consultas, y los
-- contadores de ventas y propinas siguen contando solo lo suyo.
--
-- Las funciones se reescriben con `create or replace` y el MISMO tipo de retorno.

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
    union all
    -- Consultas por Telegram: solo lo cobrado Y respondido (ahi hay ingreso).
    select 'consulta', c.cobro_coins
      from public.consulta_mensajes c, rango r
     where c.de = 'cliente' and c.estado = 'respondido' and c.cobro_coins > 0
       and c.respondido_at between r.d and r.h
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

-- ---------- Series diarias (la grafica de Finanzas) ----------
-- Para que la grafica cuadre con las cifras de al lado.

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
    union all select c.respondido_at, c.cobro_coins from public.consulta_mensajes c
               where c.de = 'cliente' and c.estado = 'respondido' and c.cobro_coins > 0
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
    union all select c.respondido_at, c.cobro_coins from public.consulta_mensajes c
               where c.de = 'cliente' and c.estado = 'respondido' and c.cobro_coins > 0
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
     and l.delta > 0 and l.motivo in ('venta_clip','propina','venta_consulta')
     and l.created_at between coalesce(desde_,'-infinity') and coalesce(hasta_,'infinity')
   group by p.id, p.handle, p.display_name
   order by sum(l.delta) desc
   limit greatest(1, least(limite, 100));
$$;
revoke all on function public.admin_ranking_creadoras(timestamptz, timestamptz, int) from public, anon;
grant execute on function public.admin_ranking_creadoras(timestamptz, timestamptz, int) to authenticated;

-- ---------- Total ganado (Usuarios) ----------
-- Solo lo que ENTRO por vender, no las recargas ni los ajustes ni los reembolsos.

create or replace function public.total_ganado(uid uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.delta), 0)::bigint from public.coin_ledger l
   where l.user_id = uid and l.delta > 0
     and l.motivo in ('venta_clip', 'propina', 'venta_consulta');
$$;
