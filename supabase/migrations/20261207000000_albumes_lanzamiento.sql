-- Albumes de fotos: lanzamiento.
--
-- Lo que hace falta para encender los albumes con seguridad:
--
-- 1) ALBUMES ABANDONADOS. Si una creadora cierra el navegador a mitad de subir, queda
--    un album INCOMPLETO y, peor, fotos ya subidas que ninguna fila menciona (las
--    filas de `album_fotos` se escriben al terminar). No se ven ni se moderan, pero
--    ocupan espacio. `admin_albumes_abandonados` los lista (incompletos de mas de
--    3 dias) y `admin_borrar_album_abandonado` los deja listos para purgar YA, sin
--    esperar los 30 dias de un clip borrado: nunca se publicaron ni se vendieron.
--
-- 2) LA PURGA ENCUENTRA TODO. `admin_por_purgar` devolvia las fotos que tienen fila.
--    Ahora devuelve TODO lo que haya en el almacenamiento bajo la carpeta del album
--    (`<autora>/<album>/...`), con o sin fila: es lo que permite limpiar un album
--    abandonado a medias.
--
-- 3) UN RESUMEN para el panel: cuantos albumes hay, cuantos esperan revision y
--    cuantos estan abandonados.

create or replace function public.admin_albumes_abandonados()
returns table (id uuid, titulo text, creadora_handle text, created_at timestamptz, num_fotos integer)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, p.handle, c.created_at, c.num_fotos
    from public.clips c join public.profiles p on p.id = c.creator_id
   where public.es_admin()
     and c.formato = 'album' and not c.completo and c.borrado_at is null
     and c.created_at < now() - interval '3 days'
   order by c.created_at;
$$;
revoke all on function public.admin_albumes_abandonados() from public, anon;
grant execute on function public.admin_albumes_abandonados() to authenticated;

create or replace function public.admin_borrar_album_abandonado(p_clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.clips;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar albumes abandonados'
      using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.clips where id = p_clip;
  if c.id is null or c.formato <> 'album' then raise exception 'Ese album no existe'; end if;
  if c.completo then raise exception 'Ese album ya esta completo: no esta abandonado'; end if;
  if c.borrado_at is not null then raise exception 'Ese album ya esta borrado'; end if;
  if c.created_at >= now() - interval '3 days' then
    raise exception 'Ese album es de hace menos de 3 dias: puede que su autora siga subiendolo';
  end if;
  -- Nunca se publico ni se vendio: se puede purgar de inmediato.
  update public.clips
     set borrado_at = now(), borrado_por = auth.uid(),
         borrado_motivo = 'Album sin terminar de subir', purgar_despues_de = now()
   where id = p_clip;
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'borrar_album_abandonado', c.creator_id,
          jsonb_build_object('clip', p_clip, 'titulo', c.title, 'fotos', c.num_fotos));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_borrar_album_abandonado(uuid) from public, anon;
grant execute on function public.admin_borrar_album_abandonado(uuid) to authenticated;

create or replace function public.admin_por_purgar()
returns table (
  id uuid, titulo text, storage_path text, cover_path text, creadora_handle text,
  borrado_at timestamptz, purgar_despues_de timestamptz,
  formato text, archivos_album jsonb
) language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.storage_path, c.cover_path, p.handle,
         c.borrado_at, c.purgar_despues_de, c.formato,
         case when c.formato <> 'album' then '[]'::jsonb else coalesce((
           -- Todo lo que haya bajo la carpeta del album, tenga o no fila, mas lo
           -- que las filas mencionen (por si el archivo ya no esta listado).
           select jsonb_agg(distinct t.ruta)
             from (select o.name as ruta from storage.objects o
                    where o.bucket_id = 'albumes'
                      and o.name like c.creator_id::text || '/' || c.id::text || '/%'
                   union
                   select f.ruta from public.album_fotos f where f.clip_id = c.id
                   union
                   select f.ruta_mini from public.album_fotos f
                    where f.clip_id = c.id and f.ruta_mini is not null) t
         ), '[]'::jsonb) end
    from public.clips c join public.profiles p on p.id = c.creator_id
   where public.es_admin()
     and c.borrado_at is not null
     and c.purgar_despues_de is not null
     and c.purgar_despues_de <= now()
   order by c.purgar_despues_de;
$$;

create or replace function public.admin_resumen_albumes()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.es_admin() then null else jsonb_build_object(
    'total',      (select count(*) from public.clips c where c.formato = 'album' and c.borrado_at is null),
    'publicados', (select count(*) from public.clips c where c.formato = 'album' and c.published),
    'en_revision',(select count(*) from public.clips c where c.formato = 'album' and c.completo
                      and c.estado = 'pendiente' and c.borrado_at is null),
    'abandonados',(select count(*) from public.clips c where c.formato = 'album' and not c.completo
                      and c.borrado_at is null and c.created_at < now() - interval '3 days'),
    'subiendo',   (select count(*) from public.clips c where c.formato = 'album' and not c.completo
                      and c.borrado_at is null and c.created_at >= now() - interval '3 days')
  ) end;
$$;
revoke all on function public.admin_resumen_albumes() from public, anon;
grant execute on function public.admin_resumen_albumes() to authenticated;
