-- Albumes de fotos: moderacion y purga.
--
-- Hasta ahora la cola de moderacion y la purga suponian que un clip es UN video.
--
-- MODERACION
--  - La cola dice si cada clip es video o album y cuantas fotos trae, para que el
--    revisor pueda abrirlo como lo que es (una cuadricula de fotos).
--  - Un album INCOMPLETO (su autora aun esta subiendo las fotos) NO aparece en la
--    cola ni en los conteos: no se puede ver, y revisarlo seria revisar a medias.
--    Entra cuando ella lo completa.
--  - Aprobar o rechazar un album usa las funciones de siempre: es un clip.
--
-- PURGA
--  - `admin_por_purgar` devuelve, para un album, la lista de archivos (fotos y
--    miniaturas) que hay que borrar del almacenamiento, ademas de la portada.
--  - `admin_marcar_purgado` quita tambien las filas de las fotos: sus archivos ya
--    no existen, y dejar las filas apuntando a nada rompe la ficha.
--  - Los archivos los borra el panel con la API de almacenamiento (SQL no puede) y
--    VERIFICA que desaparecieron (src/lib/archivos.ts) antes de llamar a
--    `admin_marcar_purgado`.
--
-- «Eliminar definitivamente» una cuenta ya recoge los archivos de TODOS los
-- buckets bajo `<id>/` (incluido `albumes`), asi que cubre fotos y miniaturas sin
-- cambios; un album con compras sigue impidiendo el borrado, como un video.

-- ---------- Cola de moderacion ----------

drop function if exists public.admin_cola_moderacion(text, integer, integer);

create function public.admin_cola_moderacion(
  filtro_estado text default 'pendiente', pagina integer default 0, por_pagina integer default 24
) returns table (
  id uuid, titulo text, descripcion text, cover_path text, storage_path text,
  duracion integer, precio integer, visibilidad text, estado text, motivo_rechazo text,
  created_at timestamptz, revisado_at timestamptz,
  creadora uuid, creadora_handle text, creadora_nombre text,
  creadora_verificada boolean, creadora_estado text,
  reportes integer, gravedad integer,
  formato text, num_fotos integer,
  total_filas bigint
) language sql stable security definer set search_path = '' as $$
  with base as (
    select c.id, c.title as titulo, c.description as descripcion,
           c.cover_path, c.storage_path, c.duration_s as duracion,
           c.price_coins as precio, c.visibility::text as visibilidad,
           c.estado::text as estado, c.motivo_rechazo, c.created_at, c.revisado_at,
           p.id as creadora, p.handle as creadora_handle,
           p.display_name as creadora_nombre,
           p.identidad_verificada as creadora_verificada,
           public.estado_cuenta(p.id) as creadora_estado,
           (select count(*)::int from public.reportes r
             where r.clip_id = c.id and r.estado in ('nuevo','en_revision')) as reportes,
           coalesce((select max(public.gravedad_reporte(r.motivo)) from public.reportes r
                      where r.clip_id = c.id and r.estado in ('nuevo','en_revision')), 0) as gravedad,
           c.formato, c.num_fotos
      from public.clips c
      join public.profiles p on p.id = c.creator_id
     where public.es_admin()
       and (filtro_estado = '' or c.estado::text = filtro_estado)
       -- un album a medio subir no se revisa todavia
       and (c.formato = 'video' or c.completo)
  )
  select b.*, count(*) over () as total_filas from base b
   -- Lo reportado primero, y dentro de eso lo mas grave; despues lo mas
   -- viejo, que es lo que lleva mas tiempo esperando una decision.
   order by (b.reportes > 0) desc, b.gravedad desc, b.reportes desc, b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_cola_moderacion(text, integer, integer) from public, anon;
grant execute on function public.admin_cola_moderacion(text, integer, integer) to authenticated;

create or replace function public.admin_conteo_moderacion()
returns table (estado text, cuantos bigint)
language sql stable security definer set search_path = '' as $$
  select c.estado::text, count(*) from public.clips c
   where public.es_admin() and (c.formato = 'video' or c.completo)
   group by c.estado;
$$;

-- ---------- Purga ----------

drop function if exists public.admin_por_purgar();

create function public.admin_por_purgar()
returns table (
  id uuid, titulo text, storage_path text, cover_path text, creadora_handle text,
  borrado_at timestamptz, purgar_despues_de timestamptz,
  formato text, archivos_album jsonb
) language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.storage_path, c.cover_path, p.handle,
         c.borrado_at, c.purgar_despues_de, c.formato,
         -- Las fotos y las miniaturas de un album, para que el panel las borre.
         coalesce((select jsonb_agg(t.ruta)
                     from (select f.ruta from public.album_fotos f where f.clip_id = c.id
                           union all
                           select f.ruta_mini from public.album_fotos f
                            where f.clip_id = c.id and f.ruta_mini is not null) t),
                  '[]'::jsonb)
    from public.clips c join public.profiles p on p.id = c.creator_id
   where public.es_admin()
     and c.borrado_at is not null
     and c.purgar_despues_de is not null
     and c.purgar_despues_de <= now()
   order by c.purgar_despues_de;
$$;
revoke all on function public.admin_por_purgar() from public, anon;
grant execute on function public.admin_por_purgar() to authenticated;

create or replace function public.admin_marcar_purgado(clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare fotos int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede purgar'
      using errcode = 'insufficient_privilege';
  end if;
  update public.clips
     set storage_path = null, cover_path = null, purgar_despues_de = null
   where id = clip and borrado_at is not null;
  if not found then raise exception 'Ese clip no esta borrado'; end if;

  -- Un album: sus archivos ya se borraron, asi que sus filas de fotos sobran.
  delete from public.album_fotos where clip_id = clip;
  get diagnostics fotos = row_count;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'purgar_archivos', auth.uid(),
          jsonb_build_object('clip', clip, 'fotos_de_album', fotos));
  return jsonb_build_object('ok', true, 'fotos', fotos);
end; $$;
