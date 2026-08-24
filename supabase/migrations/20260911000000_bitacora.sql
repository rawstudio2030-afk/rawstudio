-- Modulo 6: bitacora de auditoria.
--
-- SOBRE EL NOMBRE: la tabla fisica sigue llamandose public.admin_log porque
-- catorce funciones escriben en ella y el cuerpo de una funcion guarda el
-- nombre como texto: renombrar la tabla las romperia todas de golpe. A partir
-- de aqui registra mas que acciones de administracion (altas de cuenta,
-- accesos, subidas), asi que se lee por public.bitacora().
--
-- SOBRE LA IP: no se puede pedir al navegador, que no conoce su propia
-- direccion publica. Se toma del lado del servidor. Cloudflare va delante de
-- Supabase y pone cf-connecting-ip el mismo, asi que ese valor NO lo puede
-- falsificar quien llama. x-forwarded-for queda solo como respaldo y es menos
-- confiable: su primer elemento lo puede sembrar el cliente.

drop function if exists public._probe_cabeceras();

alter table public.admin_log add column if not exists ip inet;
comment on column public.admin_log.ip is
  'Direccion desde la que se hizo la accion, vista por el borde de la red. Nula cuando el evento no nace de una peticion HTTP (por ejemplo un disparador de base) o cuando no hay cabeceras. Que falte NO impide registrar el evento: una bitacora incompleta sirve, una bitacora ausente no.';

-- ---------- De donde sale la IP ----------

create or replace function public.ip_solicitante()
returns inet language plpgsql stable set search_path = '' as $$
declare h jsonb; v text;
begin
  h := coalesce(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
  -- Preferido: lo escribe Cloudflare, no quien llama.
  v := h->>'cf-connecting-ip';
  if v is null then
    -- Respaldo. El primer elemento lo puede sembrar el cliente, asi que solo
    -- se usa cuando no hay nada mejor.
    v := split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1);
  end if;
  v := nullif(trim(v), '');
  if v is null then return null; end if;
  return v::inet;
exception when others then
  -- Una cabecera con basura no puede tumbar la accion que se estaba
  -- registrando. Se pierde la IP, no la operacion.
  return null;
end; $$;

create or replace function public.pais_solicitante()
returns text language sql stable set search_path = '' as $$
  select nullif(upper(trim(coalesce(
    current_setting('request.headers', true)::jsonb ->> 'cf-ipcountry', ''))), '');
$$;

-- ---------- Como se anota ----------

create or replace function public.anotar(
  p_accion text, p_objetivo uuid default null, p_detalle jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare quien uuid := auth.uid(); ip inet := public.ip_solicitante();
begin
  if quien is null then return; end if;
  insert into public.admin_log (admin_id, accion, objetivo, detalle, ip)
  values (quien, p_accion, coalesce(p_objetivo, quien),
          case when ip is null then p_detalle || '{"ip_ausente":true}'::jsonb
               else p_detalle end,
          ip);
end; $$;
revoke all on function public.anotar(text, uuid, jsonb) from public, anon;
grant execute on function public.anotar(text, uuid, jsonb) to authenticated;

-- ---------- Inmutabilidad, dicha en voz alta ----------

-- Hasta ahora la bitacora era inmutable por OMISION: no existian politicas de
-- update ni de delete, y RLS niega lo que no se permite. Eso funciona, pero
-- depende de que nadie agregue una politica por descuido, y no detiene a una
-- funcion security definer. El disparador si: aplica pase lo que pase.
create or replace function public.bitacora_inmutable()
returns trigger language plpgsql as $$
begin
  raise exception 'La bitacora no se edita ni se borra (intento de % sobre admin_log)', tg_op
    using errcode = 'insufficient_privilege';
end; $$;

drop trigger if exists bitacora_sin_cambios on public.admin_log;
create trigger bitacora_sin_cambios
  before update or delete on public.admin_log
  for each row execute function public.bitacora_inmutable();

revoke update, delete on public.admin_log from anon, authenticated;

-- ---------- Lectura ----------

drop function if exists public.bitacora(text, text, timestamptz, timestamptz, int, int);
create function public.bitacora(
  busqueda text default '',
  filtro_accion text default '',
  desde_ timestamptz default null,
  hasta_ timestamptz default null,
  pagina int default 0,
  por_pagina int default 50
)
returns table (
  id bigint, accion text, created_at timestamptz, ip inet,
  actor uuid, actor_handle text, actor_nombre text,
  objetivo uuid, objetivo_handle text, objetivo_nombre text,
  detalle jsonb, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select l.id, l.accion, l.created_at, l.ip,
           l.admin_id as actor, pa.handle as actor_handle, pa.display_name as actor_nombre,
           l.objetivo, po.handle as objetivo_handle, po.display_name as objetivo_nombre,
           l.detalle
      from public.admin_log l
      left join public.profiles pa on pa.id = l.admin_id
      left join public.profiles po on po.id = l.objetivo
     where public.es_admin()      -- sin esto la bitacora quedaria a la vista
       and (filtro_accion = '' or l.accion = filtro_accion)
       and (desde_ is null or l.created_at >= desde_)
       and (hasta_ is null or l.created_at <= hasta_)
       and (busqueda = ''
            or l.accion       ilike '%'||busqueda||'%'
            or pa.handle      ilike '%'||busqueda||'%'
            or po.handle      ilike '%'||busqueda||'%'
            or pa.display_name ilike '%'||busqueda||'%'
            or po.display_name ilike '%'||busqueda||'%'
            or host(l.ip)      ilike '%'||busqueda||'%'
            or l.detalle::text ilike '%'||busqueda||'%')
  )
  select b.*, count(*) over () as total_filas from base b
   order by b.created_at desc
   limit  greatest(1, least(por_pagina, 200))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 200));
$$;
revoke all on function public.bitacora(text,text,timestamptz,timestamptz,int,int) from public, anon;
grant execute on function public.bitacora(text,text,timestamptz,timestamptz,int,int) to authenticated;

-- Catalogo de acciones vistas, para llenar el filtro sin inventar la lista.
create or replace function public.bitacora_acciones()
returns table (accion text, cuantas bigint)
language sql security definer stable set search_path = '' as $$
  select l.accion, count(*) from public.admin_log l
   where public.es_admin() group by l.accion order by count(*) desc;
$$;
revoke all on function public.bitacora_acciones() from public, anon;
grant execute on function public.bitacora_acciones() to authenticated;
