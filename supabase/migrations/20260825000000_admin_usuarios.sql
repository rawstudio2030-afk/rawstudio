-- Vista de usuarios para el panel de administracion.
--
-- El correo vive en auth.users, que el cliente NO puede consultar —y esta bien
-- que asi sea: exponer ese esquema seria filtrar el correo de todas las
-- usuarias a cualquiera con la anon key.
--
-- La salida es una funcion security definer que comprueba es_admin() ANTES de
-- devolver nada. Fuera de admin no regresa filas, no un error: asi el panel no
-- distingue entre "no eres admin" y "no hay usuarios", que es una fuga menor
-- pero gratuita de evitar.
create or replace function public.admin_listar_usuarios(busqueda text default '')
returns table (
  id                 uuid,
  email              text,
  handle             text,
  display_name       text,
  avatar_path        text,
  is_creator         boolean,
  verified           boolean,
  suspended_at       timestamptz,
  suspended_reason   text,
  adult_confirmed_at timestamptz,
  metodos            text,
  ultimo_acceso      timestamptz,
  clips_total        bigint,
  clips_publicados   bigint,
  es_admin           boolean,
  created_at         timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    p.id,
    u.email::text,
    p.handle,
    p.display_name,
    p.avatar_path,
    p.is_creator,
    p.verified,
    p.suspended_at,
    p.suspended_reason,
    p.adult_confirmed_at,
    coalesce((select string_agg(distinct i.provider, ' + ' order by i.provider)
              from auth.identities i where i.user_id = p.id), 'correo'),
    u.last_sign_in_at,
    (select count(*) from public.clips c where c.creator_id = p.id),
    (select count(*) from public.clips c where c.creator_id = p.id and c.published),
    exists (select 1 from public.admins a where a.user_id = p.id),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.es_admin()          -- sin esto, la funcion filtraria todo
    and (
      busqueda = '' or
      p.handle       ilike '%' || busqueda || '%' or
      p.display_name ilike '%' || busqueda || '%' or
      u.email        ilike '%' || busqueda || '%'
    )
  order by p.created_at desc
  limit 200;
$$;

comment on function public.admin_listar_usuarios is
  'Listado de usuarios con correo y actividad, solo para administradores. La comprobacion es_admin() esta DENTRO del where: si se quitara, la funcion expondria el correo de todas las usuarias.';

revoke all on function public.admin_listar_usuarios(text) from public, anon;
grant execute on function public.admin_listar_usuarios(text) to authenticated;
