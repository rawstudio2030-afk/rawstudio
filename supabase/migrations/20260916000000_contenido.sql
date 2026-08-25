-- Modulo 3: gestion de contenido.

-- ---------- Borrado suave ----------

alter table public.clips
  add column if not exists borrado_at     timestamptz,
  add column if not exists borrado_por    uuid references public.profiles (id),
  add column if not exists borrado_motivo text,
  add column if not exists purgar_despues_de timestamptz;

comment on column public.clips.purgar_despues_de is
  'Cuando puede borrarse el archivo de verdad. Se conserva 30 dias por si el borrado fue un error o hace falta para una reclamacion. Pasada la fecha hay que purgarlo A MANO desde el panel: borrar la fila de storage.objects con SQL no elimina el archivo, eso solo lo hace la API de almacenamiento.';

create index if not exists clips_borrado_idx on public.clips (borrado_at)
  where borrado_at is not null;

-- ---------- Destacados ----------

alter table public.clips
  add column if not exists destacado_orden int,
  add column if not exists destacado_desde timestamptz;

comment on column public.clips.destacado_orden is
  'Posicion en la portada. Nulo = no destacado. Es un entero y no un booleano porque destacar sin poder ordenar deja el orden a merced de la fecha.';

create index if not exists clips_destacado_idx on public.clips (destacado_orden)
  where destacado_orden is not null;

-- ---------- Contenido de la plataforma ----------

do $$ begin
  create type public.tipo_clip as enum ('creadora','promocional','aviso');
exception when duplicate_object then null; end $$;

alter table public.clips
  add column if not exists tipo public.tipo_clip not null default 'creadora';

comment on column public.clips.tipo is
  'Lo promocional y los avisos son de la plataforma, no de la creadora que figure como autora: no se cobran, no reparten comision y en la interfaz se atribuyen a RAWstudio. El creator_id sigue apuntando a quien lo subio porque la columna no admite nulos y porque conviene saber quien fue.';

-- ---------- La visibilidad respeta el borrado ----------

create or replace function public.clips_publicar_alta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare verificada boolean; aprobados int;
begin
  if tg_op = 'INSERT' then
    if new.tipo <> 'creadora' then
      -- El contenido de la plataforma no pasa por moderacion: lo sube quien
      -- administra, que es justamente quien moderaria.
      new.estado := 'aprobado';
    elsif public.ajuste_bool('moderacion_previa_forzada') then
      new.estado := 'pendiente';
    else
      select p.identidad_verificada into verificada
        from public.profiles p where p.id = new.creator_id;
      select count(*) into aprobados
        from public.clips c
       where c.creator_id = new.creator_id and c.estado = 'aprobado';
      if coalesce(verificada, false) and aprobados >= 5 then
        new.estado := 'aprobado';
      else
        new.estado := 'pendiente';
      end if;
    end if;
  end if;

  -- Un clip borrado no se ve, sea cual sea su estado de moderacion. Al ir
  -- aqui, las siete consultas que ya miraban published quedan cubiertas sin
  -- tocar ninguna.
  new.published := (new.estado = 'aprobado' and new.borrado_at is null);
  if new.published and new.published_at is null then
    new.published_at := now();
  elsif not new.published then
    new.published_at := null;
  end if;
  return new;
end; $$;

-- tiene_acceso tambien: quien lo compro tampoco debe poder abrir algo borrado.
create or replace function public.tiene_acceso(clip uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clips c
    where c.id = clip
      and c.borrado_at is null          -- borrado es borrado, para todo el mundo
      and (
         c.creator_id = uid
      or (c.published and c.visibility = 'gratis')
      or exists (select 1 from public.purchases p
                 where p.clip_id = clip and p.user_id = uid)
      or exists (select 1 from public.rentals r
                 where r.clip_id = clip and r.user_id = uid and r.vence > now())
      or (c.visibility = 'suscriptores' and exists (
            select 1 from public.subscriptions s
            where s.creator_id = c.creator_id and s.subscriber_id = uid
              and s.estado = 'activa' and s.periodo_fin > now()))
      )
  ) or (public.es_admin(uid)
        and exists (select 1 from public.clips c2
                     where c2.id = clip and c2.borrado_at is null));
$$;
comment on function public.tiene_acceso is
  'Unica autoridad sobre si alguien puede ver un clip. Cinco vias legitimas (es suyo, es gratis, lo compro, lo renta, esta suscrita) mas un BYPASS EXPLICITO de administracion: un admin ve cualquier contenido sin pagar ni suscribirse porque necesita poder moderarlo. Ese bypass NO alcanza a lo borrado: ahi no hay nada que moderar y conservar el acceso solo alargaria la vida de algo que se decidio quitar.';

-- ---------- Acciones ----------

create or replace function public.admin_borrar_clip(clip uuid, motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar contenido'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(motivo),'') = '' then
    raise exception 'El borrado necesita un motivo escrito';
  end if;

  update public.clips
     set borrado_at = now(), borrado_por = auth.uid(), borrado_motivo = motivo,
         purgar_despues_de = now() + interval '30 days',
         destacado_orden = null, destacado_desde = null
   where id = clip and borrado_at is null
  returning creator_id into duenia;
  if duenia is null then raise exception 'Ese clip no existe o ya estaba borrado'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'borrar_clip', duenia,
          jsonb_build_object('clip', clip, 'motivo', motivo,
                             'purgar_despues_de', now() + interval '30 days'));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_restaurar_clip(clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede restaurar contenido'
      using errcode = 'insufficient_privilege';
  end if;
  update public.clips
     set borrado_at = null, borrado_por = null, borrado_motivo = null,
         purgar_despues_de = null
   where id = clip and borrado_at is not null
  returning creator_id into duenia;
  if duenia is null then raise exception 'Ese clip no esta borrado'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'restaurar_clip', duenia, jsonb_build_object('clip', clip));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_destacar(clip uuid, posicion int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid; sit public.estado_clip; borrado timestamptz;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede destacar contenido'
      using errcode = 'insufficient_privilege';
  end if;
  select creator_id, estado, borrado_at into duenia, sit, borrado
    from public.clips where id = clip;
  if duenia is null then raise exception 'Ese clip no existe'; end if;
  if posicion is not null and (sit <> 'aprobado' or borrado is not null) then
    -- Destacar en portada algo que no esta publicado dejaria un hueco visible
    -- para todo el mundo.
    raise exception 'Solo se puede destacar un clip aprobado y no borrado';
  end if;

  update public.clips
     set destacado_orden = posicion,
         destacado_desde = case when posicion is null then null
                                else coalesce(destacado_desde, now()) end
   where id = clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), case when posicion is null then 'quitar_destacado' else 'destacar' end,
          duenia, jsonb_build_object('clip', clip, 'posicion', posicion));
  return jsonb_build_object('ok', true, 'posicion', posicion);
end; $$;

revoke all on function public.admin_borrar_clip(uuid, text)   from public, anon;
revoke all on function public.admin_restaurar_clip(uuid)      from public, anon;
revoke all on function public.admin_destacar(uuid, int)       from public, anon;
grant execute on function public.admin_borrar_clip(uuid, text) to authenticated;
grant execute on function public.admin_restaurar_clip(uuid)    to authenticated;
grant execute on function public.admin_destacar(uuid, int)     to authenticated;

-- ---------- Lo que hay que purgar ----------

create or replace function public.admin_por_purgar()
returns table (id uuid, titulo text, storage_path text, cover_path text,
               creadora_handle text, borrado_at timestamptz, purgar_despues_de timestamptz)
language sql security definer stable set search_path = '' as $$
  select c.id, c.title, c.storage_path, c.cover_path, p.handle,
         c.borrado_at, c.purgar_despues_de
    from public.clips c join public.profiles p on p.id = c.creator_id
   where public.es_admin()
     and c.borrado_at is not null
     and c.purgar_despues_de is not null
     and c.purgar_despues_de <= now()
   order by c.purgar_despues_de;
$$;
revoke all on function public.admin_por_purgar() from public, anon;
grant execute on function public.admin_por_purgar() to authenticated;

-- Se llama DESPUES de haber borrado los archivos, no antes: si se marcara
-- primero y la subida de borrado fallara, quedarian rutas apuntando a
-- archivos que siguen ocupando espacio y ya nadie volveria a mirar.
create or replace function public.admin_marcar_purgado(clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede purgar'
      using errcode = 'insufficient_privilege';
  end if;
  update public.clips
     set storage_path = null, cover_path = null, purgar_despues_de = null
   where id = clip and borrado_at is not null;
  if not found then raise exception 'Ese clip no esta borrado'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'purgar_archivos', auth.uid(), jsonb_build_object('clip', clip));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_marcar_purgado(uuid) from public, anon;
grant execute on function public.admin_marcar_purgado(uuid) to authenticated;
