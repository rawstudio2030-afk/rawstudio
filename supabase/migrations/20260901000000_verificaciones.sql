-- Solicitudes de verificacion de identidad, con revision manual.
--
-- TENSION QUE RESUELVE ESTE ARCHIVO
-- El servicio se diseño para no guardar imagenes nunca: son datos biometricos,
-- sensibles bajo la LFPDPPP, y lo que no se guarda no se puede filtrar. Pero la
-- revision manual exige VER las fotos. No se puede tener ambas.
--
-- La salida: las imagenes se guardan SOLO cuando el veredicto automatico es
-- dudoso, en bucket privado, con fecha de borrado, y avisandolo a la persona.
-- Cuando el cotejo es claro —aprobado o rechazado— siguen sin tocar disco.

create type public.estado_verificacion as enum (
  'procesando',
  'aprobada',
  'rechazada',
  'pendiente_revision'   -- el cotejo no fue concluyente; decide un humano
);

create table public.verificaciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,

  estado      public.estado_verificacion not null default 'procesando',
  similitud   numeric(5,4),      -- coseno del cotejo facial
  paso_fallido text,             -- 'curp' | 'edad' | 'ine' | 'rostro' | 'geo'
  motivo      text,              -- explicacion legible para la persona

  -- Hash, no CURP: permite detectar que una misma persona abrio dos cuentas
  -- sin poder reconstruir quien es.
  curp_hash   text,
  edad        int check (edad is null or edad between 0 and 120),

  -- Rutas en el bucket privado 'verificacion'. Nulas salvo cuando hubo que
  -- guardar para revision. Se borran al resolver.
  ine_path    text,
  selfie_path text,
  borrar_despues_de timestamptz,

  revisada_por uuid references auth.users (id),
  revisada_at  timestamptz,
  nota_revision text,

  created_at  timestamptz not null default now()
);

create index verif_usuario_idx  on public.verificaciones (user_id, created_at desc);
create index verif_pendientes_idx on public.verificaciones (created_at)
  where estado = 'pendiente_revision';
create index verif_por_borrar_idx on public.verificaciones (borrar_despues_de)
  where borrar_despues_de is not null;

alter table public.verificaciones enable row level security;

-- Cada quien ve el estado de lo suyo; el admin ve todo.
create policy verif_select on public.verificaciones for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Sin insert ni update desde el cliente: las escribe el microservicio con
-- service_role, y las resuelve el admin por funcion. Si el navegador pudiera
-- escribir aqui, bastaria un PATCH para declararse verificada.

-- ── Bucket privado para las imagenes en revision ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificacion', 'verificacion', false, 8 * 1024 * 1024,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;

-- SOLO admins leen este bucket. Ni siquiera su dueña: una vez enviada la foto
-- de su INE para revision, no hay razon para poder volver a descargarla, y
-- cada via de lectura es una via de fuga.
create policy verif_archivos_admin on storage.objects for select to authenticated
  using (bucket_id = 'verificacion' and public.es_admin());

-- ── Resolver una revision ───────────────────────────────────────────────────
create or replace function public.admin_resolver_verificacion(
  verificacion uuid, aprobar boolean, nota text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.verificaciones;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver verificaciones'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v from public.verificaciones where id = verificacion;
  if v.id is null then raise exception 'Esa verificación no existe'; end if;
  if v.estado <> 'pendiente_revision' then
    raise exception 'Esa verificación ya fue resuelta';
  end if;

  update public.verificaciones
     set estado = case when aprobar then 'aprobada' else 'rechazada' end,
         revisada_por = auth.uid(), revisada_at = now(), nota_revision = nota,
         -- Al resolver, las imagenes ya no tienen proposito. Se marcan para
         -- borrado inmediato: conservarlas "por si acaso" es como se acumulan
         -- las filtraciones.
         borrar_despues_de = now()
   where id = verificacion;

  if aprobar then
    update public.profiles
       set identidad_verificada = true,
           identidad_verificada_at = now(),
           curp_hash = coalesce(v.curp_hash, curp_hash)
     where id = v.user_id;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(),
          case when aprobar then 'verificacion_aprobada' else 'verificacion_rechazada' end,
          v.user_id, jsonb_build_object('verificacion', verificacion, 'nota', nota));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_resolver_verificacion(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolver_verificacion(uuid, boolean, text) to authenticated;

-- ── La verificacion se vuelve requisito para publicar ───────────────────────
-- Hasta ahora bastaba marcarse como creadora. Eso hacia que el age gate y la
-- verificacion fueran decorativos para quien publica, que es justo donde mas
-- importan: quien aparece en el contenido debe ser adulto comprobado.
drop policy if exists clips_insert_propio on public.clips;

create policy clips_insert_propio
  on public.clips for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_creator
        and p.suspended_at is null
        and p.identidad_verificada          -- el requisito nuevo
    )
  );
