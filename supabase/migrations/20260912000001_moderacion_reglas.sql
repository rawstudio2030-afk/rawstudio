-- Reglas de moderacion.

-- ---------- Con que estado nace un clip ----------

create or replace function public.clips_publicar_alta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare verificada boolean; aprobados int;
begin
  if tg_op = 'INSERT' then
    -- El estado inicial no lo decide quien sube. Aunque el cliente mandara
    -- estado='aprobado' o published=true, aqui se recalcula.
    if public.ajuste_bool('moderacion_previa_forzada') then
      new.estado := 'pendiente';
    else
      select p.identidad_verificada into verificada
        from public.profiles p where p.id = new.creator_id;
      select count(*) into aprobados
        from public.clips c
       where c.creator_id = new.creator_id and c.estado = 'aprobado';

      -- Creadora sin verificar, o con menos de cinco clips ya aprobados,
      -- pasa por revision previa. A partir del quinto se confia y se revisa
      -- despues, que es lo unico sostenible cuando hay volumen.
      if coalesce(verificada, false) and aprobados >= 5 then
        new.estado := 'aprobado';
      else
        new.estado := 'pendiente';
      end if;
    end if;
  end if;

  -- published se mantiene sola a partir del estado. Es la columna que miran
  -- las siete consultas que ya existian; asi ninguna tuvo que cambiar.
  new.published := (new.estado = 'aprobado');
  if new.published and new.published_at is null then
    new.published_at := now();
  elsif not new.published then
    new.published_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists clips_publicar_alta on public.clips;
create trigger clips_publicar_alta
  before insert or update on public.clips
  for each row execute function public.clips_publicar_alta();

-- ---------- Decision de la administracion ----------

create or replace function public.admin_moderar(
  clip uuid, decision public.estado_clip, motivo text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede moderar'
      using errcode = 'insufficient_privilege';
  end if;
  if decision in ('rechazado','retirado') and coalesce(trim(motivo),'') = '' then
    -- El motivo se le comunica a la creadora. Un rechazo sin explicacion no
    -- le dice que corregir, y garantiza que lo vuelva a subir igual.
    raise exception 'Un rechazo o retiro necesita motivo: se le comunica a la creadora';
  end if;

  update public.clips
     set estado = decision,
         motivo_rechazo = case when decision in ('rechazado','retirado') then motivo else null end,
         revisado_por = auth.uid(), revisado_at = now()
   where id = clip
  returning creator_id into duenia;
  if duenia is null then raise exception 'Ese clip no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'moderar_clip', duenia,
          jsonb_build_object('clip', clip, 'decision', decision, 'motivo', motivo));

  return jsonb_build_object('ok', true, 'estado', decision);
end; $$;
revoke all on function public.admin_moderar(uuid, public.estado_clip, text) from public, anon;
grant execute on function public.admin_moderar(uuid, public.estado_clip, text) to authenticated;

-- ---------- Reportar ----------

create or replace function public.reportar(
  p_clip uuid default null, p_perfil uuid default null,
  p_motivo public.motivo_reporte default 'otro', p_comentario text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare quien uuid := auth.uid(); nuevo uuid;
begin
  if quien is null then
    raise exception 'Hay que entrar para reportar' using errcode = 'insufficient_privilege';
  end if;
  if (p_clip is null) = (p_perfil is null) then
    raise exception 'Un reporte es sobre un clip o sobre un perfil';
  end if;
  if p_clip is not null and not exists (select 1 from public.clips where id = p_clip) then
    raise exception 'Ese clip no existe';
  end if;
  if p_perfil is not null and not exists (select 1 from public.profiles where id = p_perfil) then
    raise exception 'Ese perfil no existe';
  end if;

  insert into public.reportes (reporta_id, clip_id, perfil_id, motivo, comentario, ip)
  values (quien, p_clip, p_perfil, p_motivo, nullif(trim(p_comentario),''),
          public.ip_solicitante())
  on conflict (reporta_id, clip_id, perfil_id) do nothing
  returning id into nuevo;

  if nuevo is null then
    -- Ya lo habia reportado. Se responde bien para no revelar nada ni
    -- invitar a intentarlo de nuevo con otra cuenta.
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (quien, 'reportar', coalesce(p_perfil,
          (select creator_id from public.clips where id = p_clip)),
          jsonb_build_object('reporte', nuevo, 'clip', p_clip,
                             'perfil', p_perfil, 'motivo', p_motivo));

  return jsonb_build_object('ok', true, 'repetido', false);
end; $$;
revoke all on function public.reportar(uuid, uuid, public.motivo_reporte, text) from public, anon;
grant execute on function public.reportar(uuid, uuid, public.motivo_reporte, text) to authenticated;

-- ---------- Tres reportes lo bajan solo ----------

create or replace function public.reporte_despublica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cuantos int; sit public.estado_clip;
begin
  if new.clip_id is null then return new; end if;

  select count(*) into cuantos from public.reportes r
   where r.clip_id = new.clip_id and r.estado in ('nuevo','en_revision');
  select c.estado into sit from public.clips c where c.id = new.clip_id;

  -- Solo baja lo que estaba arriba. Si ya estaba pendiente o rechazado no
  -- hay nada que hacer, y volver a anotarlo llenaria la bitacora de ruido.
  if cuantos >= 3 and sit = 'aprobado' then
    update public.clips
       set estado = 'pendiente',
           motivo_rechazo = 'Despublicado automáticamente: ' || cuantos || ' reportes sin resolver'
     where id = new.clip_id;

    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (new.reporta_id, 'despublicar_automatico',
            (select creator_id from public.clips where id = new.clip_id),
            jsonb_build_object('clip', new.clip_id, 'reportes', cuantos));
  end if;
  return new;
end; $$;

drop trigger if exists reportes_despublica on public.reportes;
create trigger reportes_despublica
  after insert on public.reportes
  for each row execute function public.reporte_despublica();

-- ---------- Cola de revision ----------

create or replace function public.admin_cola_moderacion(
  filtro_estado text default 'pendiente',
  pagina int default 0, por_pagina int default 24
)
returns table (
  id uuid, titulo text, descripcion text, cover_path text, storage_path text,
  duracion int, precio int, visibilidad text, estado text,
  motivo_rechazo text, created_at timestamptz, revisado_at timestamptz,
  creadora uuid, creadora_handle text, creadora_nombre text,
  creadora_verificada boolean, creadora_estado text,
  reportes int, gravedad int, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
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
                      where r.clip_id = c.id and r.estado in ('nuevo','en_revision')), 0) as gravedad
      from public.clips c
      join public.profiles p on p.id = c.creator_id
     where public.es_admin()
       and (filtro_estado = '' or c.estado::text = filtro_estado)
  )
  select b.*, count(*) over () as total_filas from base b
   -- Lo reportado primero, y dentro de eso lo mas grave; despues lo mas
   -- viejo, que es lo que lleva mas tiempo esperando una decision.
   order by (b.reportes > 0) desc, b.gravedad desc, b.reportes desc, b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_cola_moderacion(text,int,int) from public, anon;
grant execute on function public.admin_cola_moderacion(text,int,int) to authenticated;

-- ---------- Conteo por estado, para las pestañas ----------

create or replace function public.admin_conteo_moderacion()
returns table (estado text, cuantos bigint)
language sql security definer stable set search_path = '' as $$
  select c.estado::text, count(*) from public.clips c
   where public.es_admin() group by c.estado;
$$;
revoke all on function public.admin_conteo_moderacion() from public, anon;
grant execute on function public.admin_conteo_moderacion() to authenticated;

-- ---------- La bandera global ----------

create or replace function public.admin_ajustar_bandera(p_clave text, p_valor boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar ajustes'
      using errcode = 'insufficient_privilege';
  end if;
  update public.ajustes
     set valor = to_jsonb(p_valor), updated_at = now(), updated_by = auth.uid()
   where clave = p_clave;
  if not found then raise exception 'Ese ajuste no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'cambiar_ajuste', auth.uid(),
          jsonb_build_object('clave', p_clave, 'valor', p_valor));
  return jsonb_build_object('ok', true, 'valor', p_valor);
end; $$;
revoke all on function public.admin_ajustar_bandera(text, boolean) from public, anon;
grant execute on function public.admin_ajustar_bandera(text, boolean) to authenticated;
