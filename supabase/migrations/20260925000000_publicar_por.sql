-- Listado de creadoras a las que la administracion puede publicarles.
--
-- Hacia falta porque subir por otra persona solo existia DENTRO del asistente
-- de alta: se podia publicar en el tercer paso, justo despues de crearla, y
-- nunca mas. Cerrado el asistente, esa creadora quedaba sin ninguna via para
-- recibir contenido, aunque su expediente estuviera completo.
--
-- Solo aparecen las que tienen expediente: son las mismas a las que las
-- politicas de storage permiten escribirles.

create or replace function public.admin_creadoras_gestionables(busqueda text default '')
returns table (
  id uuid, handle text, nombre text, avatar_path text,
  verificada boolean, tiene_documentos boolean,
  clips_total int, clips_publicados int, alta_at timestamptz
)
language sql security definer stable set search_path = '' as $$
  select p.id, p.handle, p.display_name, p.avatar_path,
         p.identidad_verificada,
         (e.identificacion_path is not null and e.consentimiento_path is not null),
         (select count(*)::int from public.clips c
           where c.creator_id = p.id and c.borrado_at is null),
         (select count(*)::int from public.clips c
           where c.creator_id = p.id and c.estado = 'aprobado' and c.borrado_at is null),
         e.alta_at
    from public.expedientes e
    join public.profiles p on p.id = e.user_id
   where public.es_admin()
     and (busqueda = ''
          or p.handle ilike '%'||busqueda||'%'
          or p.display_name ilike '%'||busqueda||'%')
   order by e.alta_at desc
   limit 100;
$$;
revoke all on function public.admin_creadoras_gestionables(text) from public, anon;
grant execute on function public.admin_creadoras_gestionables(text) to authenticated;
