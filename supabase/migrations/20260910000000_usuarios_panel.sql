-- Modulo 1 del panel: gestion de usuarios.
--
-- SOBRE EL ROL: la especificacion original pedia una columna `role` en la tabla
-- de usuarios con valores user|creator|admin. Se rechazo por dos razones:
--
--   1. Una columna unica vuelve los papeles excluyentes, y aqui NO lo son: el
--      titular de la plataforma es administrador y creadora a la vez. Con un
--      enum habria que elegir uno y mentir sobre el otro.
--   2. La tabla public.admins guarda ademas cuando y por que se otorgo el
--      privilegio. Una columna booleana perderia esa trazabilidad, que en una
--      plataforma de contenido adulto es justo lo que hay que poder auditar.
--
-- En su lugar el rol se DERIVA (ver public.rol_de) y se expone de solo lectura
-- para que la interfaz tenga un campo unico contra el cual filtrar y ordenar.

-- ---------- Estado de la cuenta ----------

-- Hasta ahora solo existia la suspension, sin fecha de fin y sin baneo
-- permanente. Son cosas distintas: la suspension caduca sola, el baneo no.
alter table public.profiles
  add column if not exists suspendido_hasta timestamptz,
  add column if not exists baneado_at       timestamptz,
  add column if not exists baneado_motivo   text;

comment on column public.profiles.suspendido_hasta is
  'Fin de la suspension. Nulo = indefinida. Al pasar la fecha la cuenta vuelve sola a activa: el estado se calcula, no se guarda, para no depender de una tarea programada que puede no correr.';

-- RLS controla filas, no columnas. Sin este blindaje, cualquiera podria
-- quitarse su propio baneo con un update a su perfil.
create or replace function public.profiles_proteger_columnas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claims text := current_setting('request.jwt.claims', true);
  rol    text := current_setting('request.jwt.claim.role', true);
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if claims is not null
     and coalesce(rol, claims::json->>'role', '') <> 'service_role'
     and not public.es_admin()
  then
    new.verified                := old.verified;
    new.suspended_at            := old.suspended_at;
    new.suspended_reason        := old.suspended_reason;
    new.identidad_verificada    := old.identidad_verificada;
    new.identidad_verificada_at := old.identidad_verificada_at;
    new.curp_hash               := old.curp_hash;
    new.documento_hash          := old.documento_hash;
    -- Nuevas en esta migracion. Sin ellas el baneo seria decorativo.
    new.suspendido_hasta        := old.suspendido_hasta;
    new.baneado_at              := old.baneado_at;
    new.baneado_motivo          := old.baneado_motivo;
    -- is_creator no estaba blindado: cualquiera podia declararse creadora y
    -- saltarse el alta por administracion. Nadie en el cliente lo escribe;
    -- la unica via legitima es admin_marcar_creadora().
    new.is_creator              := old.is_creator;
  end if;

  return new;
end;
$$;

-- ---------- Derivados de solo lectura ----------

create or replace function public.rol_de(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.admins a where a.user_id = uid) then 'admin'
    when (select p.is_creator from public.profiles p where p.id = uid)  then 'creadora'
    else 'usuaria'
  end;
$$;
comment on function public.rol_de is
  'Rol derivado de solo lectura. NO es una columna: ver la nota al inicio de la migracion 20260910000000. Escribirlo se hace por admin_otorgar_admin / admin_marcar_creadora.';

create or replace function public.estado_cuenta(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p.baneado_at is not null then 'baneada'
    when p.suspended_at is not null
     and (p.suspendido_hasta is null or p.suspendido_hasta > now()) then 'suspendida'
    else 'activa'
  end from public.profiles p where p.id = uid;
$$;

-- Total ganado: solo lo que ENTRO por vender, no las recargas ni los ajustes.
-- Sumar todos los deltas positivos inflaria la cifra con el dinero que la
-- propia usuaria metio a su monedero.
create or replace function public.total_ganado(uid uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.delta), 0)::bigint from public.coin_ledger l
   where l.user_id = uid and l.delta > 0
     and l.motivo in ('venta_clip', 'propina');
$$;

-- ---------- Listado paginado ----------

drop function if exists public.admin_usuarios(text, text, text, text, boolean, int, int);
create function public.admin_usuarios(
  busqueda      text    default '',
  filtro_rol    text    default '',
  filtro_estado text    default '',
  orden         text    default 'created_at',
  descendente   boolean default true,
  pagina        int     default 0,
  por_pagina    int     default 25
)
returns table (
  id uuid, email text, handle text, display_name text, avatar_path text,
  rol text, estado text, verified boolean, identidad_verificada boolean,
  suspended_at timestamptz, suspended_reason text, suspendido_hasta timestamptz,
  baneado_at timestamptz, baneado_motivo text,
  created_at timestamptz, ultimo_acceso timestamptz,
  saldo bigint, total_ganado bigint,
  clips_total bigint, clips_publicados bigint,
  es_demo boolean, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select
      p.id, u.email::text as email, p.handle, p.display_name, p.avatar_path,
      public.rol_de(p.id)        as rol,
      public.estado_cuenta(p.id) as estado,
      p.verified, p.identidad_verificada,
      p.suspended_at, p.suspended_reason, p.suspendido_hasta,
      p.baneado_at, p.baneado_motivo,
      p.created_at, u.last_sign_in_at as ultimo_acceso,
      public.saldo(p.id)::bigint        as saldo,
      public.total_ganado(p.id)         as total_ganado,
      (select count(*) from public.clips c where c.creator_id = p.id) as clips_total,
      (select count(*) from public.clips c where c.creator_id = p.id and c.published) as clips_publicados,
      p.es_demo
    from public.profiles p
    join auth.users u on u.id = p.id
    -- La comprobacion va DENTRO del where: si se quitara, esta funcion
    -- expondria el correo de todas las usuarias a cualquiera.
    where public.es_admin()
  ),
  filtrado as (
    select * from base b
    where (busqueda = '' or b.handle ilike '%'||busqueda||'%'
                         or b.display_name ilike '%'||busqueda||'%'
                         or b.email ilike '%'||busqueda||'%')
      and (filtro_rol    = '' or b.rol    = filtro_rol)
      and (filtro_estado = '' or b.estado = filtro_estado)
  ),
  -- El orden se resuelve con dos claves calculadas (una de texto y una
  -- numerica) y no con SQL dinamico: una columna de ordenamiento que llega
  -- del cliente es una via de inyeccion si se concatena.
  con_clave as (
    select f.*, count(*) over () as total_filas,
      case orden when 'handle' then f.handle when 'email' then f.email
                 when 'estado' then f.estado when 'rol' then f.rol end as k_txt,
      case orden when 'created_at'    then extract(epoch from f.created_at)
                 when 'ultimo_acceso' then extract(epoch from f.ultimo_acceso)
                 when 'saldo'         then f.saldo::numeric
                 when 'total_ganado'  then f.total_ganado::numeric
                 when 'clips_total'   then f.clips_total::numeric end as k_num
    from filtrado f
  )
  select id, email, handle, display_name, avatar_path, rol, estado, verified,
         identidad_verificada, suspended_at, suspended_reason, suspendido_hasta,
         baneado_at, baneado_motivo, created_at, ultimo_acceso, saldo,
         total_ganado, clips_total, clips_publicados, es_demo, total_filas
    from con_clave
   order by
     case when descendente then k_txt end desc nulls last,
     case when not descendente then k_txt end asc  nulls last,
     case when descendente then k_num end desc nulls last,
     case when not descendente then k_num end asc  nulls last,
     created_at desc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_usuarios(text,text,text,text,boolean,int,int) from public, anon;
grant execute on function public.admin_usuarios(text,text,text,text,boolean,int,int) to authenticated;

-- ---------- Acciones ----------

-- Una salvaguarda que se repite en las tres: no se puede castigar a otro
-- administrador. Si hiciera falta, primero se le revoca el privilegio, y eso
-- queda registrado por separado. Evita que un admin comprometido silencie a
-- los demas de un golpe.
create or replace function public.admin_suspender(
  objetivo uuid, motivo text, hasta timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede suspender cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(motivo), '') = '' then
    raise exception 'La suspension necesita un motivo escrito';
  end if;
  if objetivo = auth.uid() then
    raise exception 'No puedes suspender tu propia cuenta';
  end if;
  if public.es_admin(objetivo) then
    raise exception 'Primero revoca el privilegio de administrador';
  end if;
  if hasta is not null and hasta <= now() then
    raise exception 'La fecha de fin ya paso';
  end if;

  update public.profiles
     set suspended_at = now(), suspended_reason = motivo, suspendido_hasta = hasta
   where id = objetivo;
  if not found then raise exception 'Ese usuario no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'suspender', objetivo,
          jsonb_build_object('motivo', motivo, 'hasta', hasta));
  return jsonb_build_object('ok', true, 'estado', public.estado_cuenta(objetivo));
end; $$;

create or replace function public.admin_banear(objetivo uuid, motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede banear cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(motivo), '') = '' then
    raise exception 'El baneo necesita un motivo escrito';
  end if;
  if objetivo = auth.uid() then
    raise exception 'No puedes banear tu propia cuenta';
  end if;
  if public.es_admin(objetivo) then
    raise exception 'Primero revoca el privilegio de administrador';
  end if;

  update public.profiles
     set baneado_at = now(), baneado_motivo = motivo
   where id = objetivo;
  if not found then raise exception 'Ese usuario no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'banear', objetivo, jsonb_build_object('motivo', motivo));
  return jsonb_build_object('ok', true, 'estado', public.estado_cuenta(objetivo));
end; $$;

create or replace function public.admin_reactivar(objetivo uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare antes text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede reactivar cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  antes := public.estado_cuenta(objetivo);
  update public.profiles
     set suspended_at = null, suspended_reason = null, suspendido_hasta = null,
         baneado_at = null, baneado_motivo = null
   where id = objetivo;
  if not found then raise exception 'Ese usuario no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'reactivar', objetivo, jsonb_build_object('estado_previo', antes));
  return jsonb_build_object('ok', true, 'estado', 'activa');
end; $$;

revoke all on function public.admin_suspender(uuid, text, timestamptz) from public, anon;
revoke all on function public.admin_banear(uuid, text)                 from public, anon;
revoke all on function public.admin_reactivar(uuid)                    from public, anon;
grant execute on function public.admin_suspender(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_banear(uuid, text)                 to authenticated;
grant execute on function public.admin_reactivar(uuid)                    to authenticated;

-- ---------- Detalle de una usuaria ----------

create or replace function public.admin_usuario_detalle(objetivo uuid)
returns jsonb language sql security definer stable set search_path = '' as $$
  select case when not public.es_admin() then
    jsonb_build_object('error', 'Solo un administrador puede ver esta ficha')
  else jsonb_build_object(
    'clips', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'titulo', c.title, 'publicado', c.published,
        'visibilidad', c.visibility, 'precio', c.price_coins,
        'portada', c.cover_path, 'created_at', c.created_at)
      order by c.created_at desc)
      from public.clips c where c.creator_id = objetivo), '[]'::jsonb),

    'movimientos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'delta', l.delta, 'motivo', l.motivo, 'nota', l.nota,
        'creado_por', l.creado_por, 'created_at', l.created_at)
      order by l.created_at desc)
      from (select * from public.coin_ledger l2
             where l2.user_id = objetivo order by l2.created_at desc limit 50) l), '[]'::jsonb),

    'acciones', coalesce((select jsonb_agg(jsonb_build_object(
        'id', g.id, 'accion', g.accion, 'detalle', g.detalle,
        'admin', g.admin_id, 'created_at', g.created_at)
      order by g.created_at desc)
      from (select * from public.admin_log a
             where a.objetivo = admin_usuario_detalle.objetivo
             order by a.created_at desc limit 50) g), '[]'::jsonb),

    -- Los reportes de usuarias son el Modulo 7 y todavia no existe la tabla.
    -- Se devuelve la llave vacia para que la interfaz ya pueda contar con ella
    -- y no haya que cambiar el contrato despues.
    'reportes', '[]'::jsonb
  ) end;
$$;
revoke all on function public.admin_usuario_detalle(uuid) from public, anon;
grant execute on function public.admin_usuario_detalle(uuid) to authenticated;

-- ---------- Notas sobre el acceso del administrador ----------

comment on function public.tiene_acceso is
  'Unica autoridad sobre si alguien puede ver un clip. Cinco vias de acceso legitimas (es suyo, es gratis, lo compro, lo renta, esta suscrita) mas un BYPASS EXPLICITO de administrador al final: un admin ve cualquier contenido sin pagar ni suscribirse, porque necesita poder moderarlo. Ese bypass es intencional; si algun dia deja de serlo, se quita de aqui y de ningun otro lado.';

comment on table public.live_shows is
  'OBSOLETA. Los shows en vivo se retiraron del producto. Se conserva hasta confirmar que no hay datos; eliminar en una migracion aparte junto con show_tickets, estado_show y acceso_show.';
comment on table public.show_tickets is
  'OBSOLETA. Ver el comentario de public.live_shows.';
