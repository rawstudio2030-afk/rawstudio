-- Comentarios y reseñas en la ficha del clip.
--
-- Quien puede VER la ficha del clip puede LEER sus comentarios y el resumen de
-- reseñas. Quien puede ABRIR el video (`tiene_acceso`: compra, renta,
-- suscripcion, gratis vigente o la propia autora) puede comentar y calificar.
-- Una calificacion por persona y clip; la autora no califica lo suyo, pero si
-- comenta.
--
-- Todo lo que se escribe va por funcion: las tablas no tienen politicas para
-- `anon` ni `authenticated`, asi que ningun PATCH ni INSERT directo llega.
-- Las comprobaciones de edad, suspension, veto y acceso son las de siempre
-- (`mayor_confirmada`, `cuenta_activa`, `tiene_acceso`), no copias.
--
-- - Texto de 1 a 500 caracteres, sin blancos de sobra al principio ni al final. Se guarda tal cual: la
--   pantalla lo pinta como texto, nunca como HTML.
-- - Un tope de 5 comentarios por cuenta por minuto.
-- - Borrado blando (`borrado_at`): lo borra su autora, la duenia del clip o
--   administracion. Un borrado ajeno queda en la bitacora.
-- - Los comentarios y calificaciones de una cuenta vetada no se muestran ni
--   cuentan. Los de una cuenta anonimizada se muestran como «Cuenta eliminada».

-- ---------- Tablas ----------

create table public.comentarios_clip (
  id          uuid primary key default gen_random_uuid(),
  clip_id     uuid not null references public.clips (id) on delete cascade,
  autora_id   uuid not null references public.profiles (id) on delete cascade,
  texto       text not null check (char_length(texto) between 1 and 500),
  created_at  timestamptz not null default now(),
  borrado_at  timestamptz,
  borrado_por uuid references public.profiles (id) on delete set null
);
create index comentarios_clip_recientes_idx
  on public.comentarios_clip (clip_id, created_at desc) where borrado_at is null;
create index comentarios_clip_autora_idx
  on public.comentarios_clip (autora_id, created_at desc);

create table public.resenas_clip (
  clip_id      uuid not null references public.clips (id) on delete cascade,
  autora_id    uuid not null references public.profiles (id) on delete cascade,
  calificacion smallint not null check (calificacion between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (clip_id, autora_id)
);

alter table public.comentarios_clip enable row level security;
alter table public.resenas_clip enable row level security;
revoke all on public.comentarios_clip from anon, authenticated;
revoke all on public.resenas_clip from anon, authenticated;

-- ---------- Pieza interna: ¿se ve la ficha? ----------
-- Mismo criterio que la ficha: publicado y de una cuenta no vetada, o de quien
-- pregunta, o para administracion; y no borrado.

create or replace function public.ficha_visible(p_clip uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clips c
     where c.id = p_clip and c.borrado_at is null
       and ((c.published and public.cuenta_no_baneada(c.creator_id))
            or c.creator_id = auth.uid() or public.es_admin()));
$$;
revoke all on function public.ficha_visible(uuid) from public, anon, authenticated;

-- ---------- Leer ----------

create or replace function public.comentarios_de(
  p_clip uuid, p_antes timestamptz default null, p_cuantos integer default 20
) returns table (
  id uuid, texto text, created_at timestamptz,
  handle text, display_name text, avatar_path text, verified boolean,
  es_creadora boolean, es_mio boolean, puede_borrar boolean
) language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := auth.uid(); duenia uuid; soy_admin boolean := public.es_admin();
begin
  if not public.ficha_visible(p_clip) then return; end if;
  select c.creator_id into duenia from public.clips c where c.id = p_clip;
  return query
    select m.id, m.texto, m.created_at,
           case when p.anonimizada_at is null then p.handle end,
           case when p.anonimizada_at is null then p.display_name else 'Cuenta eliminada' end,
           case when p.anonimizada_at is null then p.avatar_path end,
           p.verified,
           (m.autora_id = duenia),
           coalesce(m.autora_id = yo, false),        -- sin sesion `yo` es nulo
           coalesce(m.autora_id = yo or duenia = yo or soy_admin, false)
      from public.comentarios_clip m
      join public.profiles p on p.id = m.autora_id
     where m.clip_id = p_clip and m.borrado_at is null
       and (p_antes is null or m.created_at < p_antes)
       and (p.baneado_at is null or p.anonimizada_at is not null)
     order by m.created_at desc
     limit least(greatest(coalesce(p_cuantos, 20), 1), 50);
end; $$;
revoke all on function public.comentarios_de(uuid, timestamptz, integer) from public;
grant execute on function public.comentarios_de(uuid, timestamptz, integer) to anon, authenticated;

create or replace function public.resumen_resenas(p_clip uuid)
returns table (promedio numeric, cantidad integer, mi_calificacion smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ficha_visible(p_clip) then
    return query select null::numeric, 0, null::smallint;
    return;
  end if;
  return query
    select round(avg(r.calificacion)::numeric, 1), count(*)::int,
           (select r2.calificacion from public.resenas_clip r2
             where r2.clip_id = p_clip and r2.autora_id = auth.uid())
      from public.resenas_clip r
      join public.profiles p on p.id = r.autora_id
     where r.clip_id = p_clip and (p.baneado_at is null or p.anonimizada_at is not null);
end; $$;
revoke all on function public.resumen_resenas(uuid) from public;
grant execute on function public.resumen_resenas(uuid) to anon, authenticated;

-- ---------- Escribir ----------

-- Lo que tiene que cumplir quien escribe, en un solo sitio.
create or replace function public.puede_opinar(p_clip uuid, yo uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if yo is null then
    raise exception 'Entra para comentar' using errcode = 'insufficient_privilege';
  end if;
  if not public.cuenta_activa(yo) then
    raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion';
  end if;
  if not public.mayor_confirmada(yo) then
    raise exception 'Confirma que eres mayor de edad para continuar';
  end if;
  if not public.tiene_acceso(p_clip, yo) then
    raise exception 'Desbloquea el video para opinar' using errcode = 'insufficient_privilege';
  end if;
end; $$;
revoke all on function public.puede_opinar(uuid, uuid) from public, anon, authenticated;

create or replace function public.comentar(p_clip uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  -- Recorta todo el blanco, no solo los espacios: tambien saltos de linea,
  -- tabulaciones, espacio duro y los caracteres de ancho cero, que se ven como
  -- nada y servian para publicar «vacio».
  limpio text := regexp_replace(coalesce(p_texto, ''),
    '^[\s\u00a0\u200b\u200c\u200d\u2060\ufeff]+|[\s\u00a0\u200b\u200c\u200d\u2060\ufeff]+$', '', 'g');
  recientes int; nuevo uuid;
begin
  perform public.puede_opinar(p_clip, yo);
  if char_length(limpio) = 0 then raise exception 'Escribe algo antes de publicar'; end if;
  if char_length(limpio) > 500 then raise exception 'El comentario pasa de 500 caracteres'; end if;

  perform pg_advisory_xact_lock(hashtextextended('comentar:' || yo::text, 0));
  select count(*) into recientes from public.comentarios_clip m
   where m.autora_id = yo and m.created_at > now() - interval '1 minute';
  if recientes >= 5 then
    raise exception 'Vas demasiado rapido; intenta en un momento';
  end if;

  insert into public.comentarios_clip (clip_id, autora_id, texto)
  values (p_clip, yo, limpio) returning id into nuevo;
  return jsonb_build_object('ok', true, 'id', nuevo);
end; $$;
revoke all on function public.comentar(uuid, text) from public, anon;
grant execute on function public.comentar(uuid, text) to authenticated;

create or replace function public.calificar(p_clip uuid, p_calificacion smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid();
begin
  perform public.puede_opinar(p_clip, yo);
  if p_calificacion is null or p_calificacion not between 1 and 5 then
    raise exception 'La calificacion va de 1 a 5';
  end if;
  if exists (select 1 from public.clips c where c.id = p_clip and c.creator_id = yo) then
    raise exception 'No puedes calificar tu propio clip';
  end if;
  insert into public.resenas_clip (clip_id, autora_id, calificacion)
  values (p_clip, yo, p_calificacion)
  on conflict (clip_id, autora_id)
  do update set calificacion = excluded.calificacion, updated_at = now();
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.calificar(uuid, smallint) from public, anon;
grant execute on function public.calificar(uuid, smallint) to authenticated;

create or replace function public.quitar_calificacion(p_clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'Entra para opinar' using errcode = 'insufficient_privilege';
  end if;
  delete from public.resenas_clip where clip_id = p_clip and autora_id = yo;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.quitar_calificacion(uuid) from public, anon;
grant execute on function public.quitar_calificacion(uuid) to authenticated;

create or replace function public.borrar_comentario(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); m public.comentarios_clip; duenia uuid;
begin
  if yo is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  select * into m from public.comentarios_clip where id = p_id;
  if m.id is null or m.borrado_at is not null then
    raise exception 'Ese comentario no existe';
  end if;
  select c.creator_id into duenia from public.clips c where c.id = m.clip_id;
  if not (m.autora_id = yo or duenia = yo or public.es_admin()) then
    raise exception 'No puedes borrar este comentario' using errcode = 'insufficient_privilege';
  end if;

  update public.comentarios_clip set borrado_at = now(), borrado_por = yo where id = p_id;

  -- Un borrado ajeno (de administracion) deja rastro; el de la propia autora no.
  if m.autora_id <> yo and public.es_admin() then
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (yo, 'borrar_comentario', m.autora_id,
            jsonb_build_object('comentario', p_id, 'clip', m.clip_id));
  end if;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.borrar_comentario(uuid) from public, anon;
grant execute on function public.borrar_comentario(uuid) to authenticated;
