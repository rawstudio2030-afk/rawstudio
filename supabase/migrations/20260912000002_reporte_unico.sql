-- Arregla el "una persona, un reporte".
--
-- EL FALLO: la restriccion era unique (reporta_id, clip_id, perfil_id), y en
-- un reporte sobre un clip la columna perfil_id va nula (y al reves). Postgres
-- considera que dos NULL son DISTINTOS, asi que (yo, clip, null) nunca choca
-- consigo mismo: la restriccion no impedia nada y el "on conflict do nothing"
-- no se activaba jamas.
--
-- POR QUE IMPORTA: tres reportes despublican un clip. Sin esto, UNA SOLA
-- persona podia reportar tres veces y bajar el contenido de quien quisiera.
-- Era una via de censura, no un detalle de integridad.

alter table public.reportes drop constraint if exists reporte_unico;

-- Dos indices parciales en vez de uno compuesto: cada uno cubre solo las
-- filas donde su columna tiene valor, asi que no hay NULL involucrados.
create unique index if not exists reporte_unico_clip
  on public.reportes (reporta_id, clip_id) where clip_id is not null;
create unique index if not exists reporte_unico_perfil
  on public.reportes (reporta_id, perfil_id) where perfil_id is not null;

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

  -- is not distinct from compara tratando NULL como un valor mas, que es
  -- justo lo que la restriccion anterior no hacia.
  if exists (select 1 from public.reportes r
              where r.reporta_id = quien
                and r.clip_id   is not distinct from p_clip
                and r.perfil_id is not distinct from p_perfil) then
    -- Se responde bien: decirle que ya lo habia reportado no aporta nada y
    -- solo invita a intentarlo desde otra cuenta.
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;

  begin
    insert into public.reportes (reporta_id, clip_id, perfil_id, motivo, comentario, ip)
    values (quien, p_clip, p_perfil, p_motivo, nullif(trim(p_comentario),''),
            public.ip_solicitante())
    returning id into nuevo;
  exception when unique_violation then
    -- Dos peticiones a la vez. El indice es la garantia de verdad; la
    -- comprobacion de arriba solo sirve para responder bonito.
    return jsonb_build_object('ok', true, 'repetido', true);
  end;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (quien, 'reportar', coalesce(p_perfil,
          (select creator_id from public.clips where id = p_clip)),
          jsonb_build_object('reporte', nuevo, 'clip', p_clip,
                             'perfil', p_perfil, 'motivo', p_motivo));

  return jsonb_build_object('ok', true, 'repetido', false);
end; $$;
revoke all on function public.reportar(uuid, uuid, public.motivo_reporte, text) from public, anon;
grant execute on function public.reportar(uuid, uuid, public.motivo_reporte, text) to authenticated;
