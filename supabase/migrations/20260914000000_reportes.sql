-- Modulo 7: atencion de reportes.
--
-- La tabla se creo con el Modulo 2 porque la regla de "tres reportes
-- despublican" no podia existir sin ella. Faltaba lo demas: la cola, la
-- resolucion, y sobre todo la forma de reportar desde la aplicacion. Sin eso
-- aquella regla era codigo que no podia dispararse: nadie tenia como reportar.

-- ---------- Cola ----------

create or replace function public.admin_reportes(
  filtro_estado text default 'nuevo',
  filtro_motivo text default '',
  pagina int default 0, por_pagina int default 30
)
returns table (
  id uuid, motivo text, gravedad int, comentario text, estado text,
  created_at timestamptz, resuelto_at timestamptz, nota_resolucion text, ip inet,
  reporta uuid, reporta_handle text,
  clip_id uuid, clip_titulo text, clip_estado text, clip_portada text,
  perfil_id uuid, perfil_handle text, perfil_estado text,
  creadora uuid, creadora_handle text,
  otros_del_mismo int, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select r.id, r.motivo::text as motivo,
           public.gravedad_reporte(r.motivo) as gravedad,
           r.comentario, r.estado::text as estado, r.created_at, r.resuelto_at,
           r.nota_resolucion, r.ip,
           r.reporta_id as reporta, pr.handle as reporta_handle,
           r.clip_id, c.title as clip_titulo, c.estado::text as clip_estado,
           c.cover_path as clip_portada,
           r.perfil_id, pp.handle as perfil_handle,
           public.estado_cuenta(pp.id) as perfil_estado,
           coalesce(c.creator_id, r.perfil_id) as creadora,
           coalesce(pc.handle, pp.handle) as creadora_handle,
           -- Cuantos reportes SIN RESOLVER pesan sobre el mismo objetivo. Es
           -- lo que decide si ya se despublico solo, y evita revisar cinco
           -- veces el mismo clip sin saber que son del mismo caso.
           (select count(*)::int from public.reportes r2
             where r2.estado in ('nuevo','en_revision')
               and (r2.clip_id   is not distinct from r.clip_id)
               and (r2.perfil_id is not distinct from r.perfil_id)) as otros_del_mismo
      from public.reportes r
      left join public.profiles pr on pr.id = r.reporta_id
      left join public.clips    c  on c.id  = r.clip_id
      left join public.profiles pc on pc.id = c.creator_id
      left join public.profiles pp on pp.id = r.perfil_id
     where public.es_admin()
       and (filtro_estado = '' or r.estado::text = filtro_estado)
       and (filtro_motivo = '' or r.motivo::text = filtro_motivo)
  )
  select b.*, count(*) over () as total_filas from base b
   -- Lo mas grave primero y, a igual gravedad, lo que lleva mas esperando.
   order by b.gravedad desc, b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_reportes(text,text,int,int) from public, anon;
grant execute on function public.admin_reportes(text,text,int,int) to authenticated;

create or replace function public.admin_conteo_reportes()
returns table (estado text, cuantos bigint)
language sql security definer stable set search_path = '' as $$
  select r.estado::text, count(*) from public.reportes r
   where public.es_admin() group by r.estado;
$$;
revoke all on function public.admin_conteo_reportes() from public, anon;
grant execute on function public.admin_conteo_reportes() to authenticated;

-- ---------- Resolver ----------

create or replace function public.admin_resolver_reporte(
  reporte uuid, nuevo_estado public.estado_reporte, nota text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare obj_clip uuid; obj_perfil uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver reportes'
      using errcode = 'insufficient_privilege';
  end if;
  if nuevo_estado = 'desestimado' and coalesce(trim(nota),'') = '' then
    -- Desestimar es decirle a quien reporto que se equivoco. Sin motivo
    -- escrito no hay forma de saber despues si la decision fue buena.
    raise exception 'Desestimar un reporte necesita una nota que lo explique';
  end if;

  update public.reportes
     set estado = nuevo_estado,
         resuelto_por = case when nuevo_estado in ('resuelto','desestimado') then auth.uid() end,
         resuelto_at  = case when nuevo_estado in ('resuelto','desestimado') then now() end,
         nota_resolucion = nota
   where id = reporte
  returning clip_id, perfil_id into obj_clip, obj_perfil;
  if not found then raise exception 'Ese reporte no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'resolver_reporte', coalesce(obj_perfil,
          (select creator_id from public.clips where id = obj_clip)),
          jsonb_build_object('reporte', reporte, 'estado', nuevo_estado, 'nota', nota));

  return jsonb_build_object('ok', true, 'estado', nuevo_estado);
end; $$;
revoke all on function public.admin_resolver_reporte(uuid, public.estado_reporte, text) from public, anon;
grant execute on function public.admin_resolver_reporte(uuid, public.estado_reporte, text) to authenticated;

-- Resolver de golpe todos los reportes sin resolver de un mismo objetivo.
-- Sirve al terminar de moderar: la decision fue una sola, y cerrarlos uno por
-- uno solo invita a dejarse alguno abierto contando para la despublicacion.
create or replace function public.admin_cerrar_reportes_de(
  p_clip uuid default null, p_perfil uuid default null, nota text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare cuantos int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver reportes'
      using errcode = 'insufficient_privilege';
  end if;
  update public.reportes
     set estado = 'resuelto', resuelto_por = auth.uid(), resuelto_at = now(),
         nota_resolucion = nota
   where estado in ('nuevo','en_revision')
     and (clip_id is not distinct from p_clip)
     and (perfil_id is not distinct from p_perfil);
  get diagnostics cuantos = row_count;

  if cuantos > 0 then
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'cerrar_reportes', coalesce(p_perfil,
            (select creator_id from public.clips where id = p_clip)),
            jsonb_build_object('clip', p_clip, 'perfil', p_perfil,
                               'cuantos', cuantos, 'nota', nota));
  end if;
  return jsonb_build_object('ok', true, 'cerrados', cuantos);
end; $$;
revoke all on function public.admin_cerrar_reportes_de(uuid, uuid, text) from public, anon;
grant execute on function public.admin_cerrar_reportes_de(uuid, uuid, text) to authenticated;

-- ---------- Lo que ve quien reporta ----------

create or replace function public.mis_reportes()
returns table (id uuid, motivo text, estado text, created_at timestamptz,
               clip_id uuid, perfil_id uuid)
language sql security definer stable set search_path = '' as $$
  select r.id, r.motivo::text, r.estado::text, r.created_at, r.clip_id, r.perfil_id
    from public.reportes r
   where r.reporta_id = auth.uid()
   order by r.created_at desc limit 50;
$$;
revoke all on function public.mis_reportes() from public, anon;
grant execute on function public.mis_reportes() to authenticated;
