-- El listado del panel debe distinguir los perfiles de demostracion, para que
-- no se confundan con personas reales al revisarlos.
--
-- Se suelta antes de recrearla: 'create or replace' no puede cambiar el tipo de
-- retorno de una funcion existente, y aqui se agrega una columna.
drop function if exists public.admin_listar_usuarios(text);

create function public.admin_listar_usuarios(busqueda text default '')
returns table (
  id uuid, email text, handle text, display_name text, avatar_path text,
  is_creator boolean, verified boolean, suspended_at timestamptz,
  suspended_reason text, adult_confirmed_at timestamptz, metodos text,
  ultimo_acceso timestamptz, clips_total bigint, clips_publicados bigint,
  es_admin boolean, es_demo boolean, created_at timestamptz
)
language sql security definer stable set search_path = ''
as $$
  select p.id, u.email::text, p.handle, p.display_name, p.avatar_path,
    p.is_creator, p.verified, p.suspended_at, p.suspended_reason,
    p.adult_confirmed_at,
    coalesce((select string_agg(distinct i.provider, ' + ' order by i.provider)
              from auth.identities i where i.user_id = p.id), 'correo'),
    u.last_sign_in_at,
    (select count(*) from public.clips c where c.creator_id = p.id),
    (select count(*) from public.clips c where c.creator_id = p.id and c.published),
    exists (select 1 from public.admins a where a.user_id = p.id),
    p.es_demo,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.es_admin()
    and (busqueda = '' or p.handle ilike '%' || busqueda || '%'
         or p.display_name ilike '%' || busqueda || '%'
         or u.email ilike '%' || busqueda || '%')
  order by p.es_demo, p.created_at desc
  limit 200;
$$;

revoke all on function public.admin_listar_usuarios(text) from public, anon;
grant execute on function public.admin_listar_usuarios(text) to authenticated;
