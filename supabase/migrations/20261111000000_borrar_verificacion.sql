-- Borrar de verdad las fotos de verificacion.
--
-- ---------- La promesa que no cumplia nadie ----------
--
-- La pantalla de verificacion le dice a cada persona, con estas palabras:
-- «Una persona del equipo revisa tus fotos y LAS BORRA AL TERMINAR. De todo
-- esto solo conservamos que eres mayor de edad y la fecha.» El panel enseña
-- «Las imagenes se borran el <fecha>». Y `solicitar_verificacion_v2` escribe
-- `borrar_despues_de = now() + 30 dias`.
--
-- Nada de eso borraba nada. La columna se escribia, se enseñaba, y ahi se
-- acababa: ninguna funcion tocaba el bucket `verificacion`. Cada INE y cada
-- selfie que ha entrado desde septiembre sigue entero donde se subio.
--
-- No es un descuido cosmetico. Son datos biometricos y de identidad bajo la
-- LFPDPPP, la finalidad para la que se recabaron se agota al resolver la
-- verificacion, y el plazo lo anunciamos nosotros. Guardarlos de mas no es
-- "por si acaso": es exactamente la pila de la que se nutre una filtracion.
--
-- ---------- Por que el borrado no puede vivir en SQL ----------
--
-- Postgres no puede borrar un archivo de Storage. Se puede borrar la fila de
-- `storage.objects`, pero eso deja el archivo huerfano en el almacen: la base
-- se olvida de el y el objeto sigue existiendo, que es el peor resultado
-- posible —parece borrado y no lo esta—.
--
-- Asi que el borrado lo hace la funcion de borde `borrar-verificacion`, que
-- llama a la API de Storage. Esta migracion pone las tres piezas que necesita:
-- que hay que borrar, como marcarlo, y quien se lo pide.
--
-- ---------- Lo que pasa con una solicitud que nadie reviso ----------
--
-- A los treinta dias hay que borrar las imagenes aunque siga pendiente,
-- porque el plazo se le prometio a ella y no depende de que nosotros
-- lleguemos a tiempo. Pero borrarlas y dejarla en `pendiente_revision` la
-- deja ATRAPADA: sin imagenes nadie puede resolverla, y
-- `solicitar_verificacion_v2` no la deja mandar otra mientras tenga una
-- pendiente. Se quedaria sin poder publicar para siempre y sin saber por que.
--
-- Por eso al borrar por plazo la solicitud pasa a `rechazada` con un motivo
-- que lo explica. `rechazada` no le cierra ninguna puerta: no toca
-- `identidad_verificada`, y es justo el estado que la deja volver a
-- intentarlo.
--
-- No se añade un estado 'caducada', que seria mas exacto, porque
-- `alter type ... add value` no se puede usar en la misma transaccion que lo
-- declara y Supabase corre cada migracion en una. Dos migraciones por un
-- matiz que el motivo ya explica no valen la pena.

alter table public.verificaciones
  add column if not exists imagenes_borradas_at timestamptz;

comment on column public.verificaciones.imagenes_borradas_at is
  'Cuando se borraron del almacen la INE y el selfie de esta solicitud. Lo escribe la funcion de borde `borrar-verificacion` DESPUES de que Storage confirme. Null con `ine_path` tambien null = nunca hubo imagenes.';

-- ---------- Que hay que borrar ----------

create or replace function public.verificacion_por_borrar(cuantas int default 200)
returns jsonb
language sql security definer stable set search_path = '' as $$
  select coalesce(jsonb_agg(f), '[]'::jsonb) from (
    select v.id,
           v.ine_path,
           v.selfie_path,
           -- Lo necesita la funcion de borde para distinguir «se resolvio y
           -- toca limpiar» de «se cumplio el plazo sin que nadie mirara».
           v.estado::text as estado
      from public.verificaciones v
     where v.borrar_despues_de is not null
       and v.borrar_despues_de <= now()
       and (v.ine_path is not null or v.selfie_path is not null)
     order by v.borrar_despues_de
     limit greatest(1, least(cuantas, 500))
  ) f;
$$;

comment on function public.verificacion_por_borrar is
  'Las verificaciones cuyas imagenes ya deberian estar borradas: resueltas (el plazo se pone en now() al resolver) o vencidas por los treinta dias. Solo para la funcion de borde `borrar-verificacion`.';

-- ---------- Dar por borradas ----------

create or replace function public.marcar_verificacion_borrada(ids uuid[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  limpiadas int;
  caducadas int;
begin
  -- Las que seguian esperando revision se cierran, porque sin imagenes ya no
  -- se pueden resolver y dejarlas abiertas la atrapa. Va PRIMERO para poder
  -- contarlas: despues del otro update ya no se distinguen.
  with cerradas as (
    update public.verificaciones
       set estado = 'rechazada',
           motivo = 'Se cumplió el plazo de 30 días que prometimos para conservar las imágenes y nadie alcanzó a revisarlas. Se borraron. Puedes volver a intentarlo.',
           revisada_at = now()
     where id = any(ids)
       and estado = 'pendiente_revision'
    returning 1)
  select count(*)::int into caducadas from cerradas;

  with tocadas as (
    update public.verificaciones
       set ine_path = null,
           selfie_path = null,
           imagenes_borradas_at = now()
     where id = any(ids)
       and (ine_path is not null or selfie_path is not null)
    returning 1)
  select count(*)::int into limpiadas from tocadas;

  return jsonb_build_object('limpiadas', limpiadas, 'caducadas', caducadas);
end; $$;

comment on function public.marcar_verificacion_borrada is
  'Olvida las rutas de las imagenes y cierra las que caducaron esperando. Se llama DESPUES de que Storage confirme el borrado, nunca antes: si se marcara primero y el borrado fallara, la base diria que no hay imagenes mientras siguen en el almacen, y entonces nadie volveria a buscarlas.';

revoke all on function public.verificacion_por_borrar(int) from public, anon, authenticated;
revoke all on function public.marcar_verificacion_borrada(uuid[]) from public, anon, authenticated;
grant execute on function public.verificacion_por_borrar(int) to service_role;
grant execute on function public.marcar_verificacion_borrada(uuid[]) to service_role;

-- ---------- Pedir el borrado en cuanto se resuelve ----------
--
-- `admin_resolver_verificacion` ya pone `borrar_despues_de = now()` al
-- aprobar o rechazar. Con esto, ademas, el borrado ocurre en segundos en vez
-- de esperar a la siguiente pasada del cron: la promesa es «las borra al
-- terminar», y dos horas despues no es al terminar.

create or replace function public.tr_verificacion_resuelta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('borrar-verificacion');
  return null;
end; $$;

drop trigger if exists verificacion_resuelta_borra on public.verificaciones;
create trigger verificacion_resuelta_borra
  after update of estado on public.verificaciones
  for each row
  -- La condicion mira las rutas, y eso ademas corta la recursion: cuando
  -- `marcar_verificacion_borrada` cierra una caducada tambien deja las rutas
  -- en null, asi que ese update no vuelve a disparar nada.
  when (new.estado is distinct from old.estado
        and (new.ine_path is not null or new.selfie_path is not null))
  execute function public.tr_verificacion_resuelta();

-- ---------- El panel tiene que poder decir la verdad ----------
--
-- Hoy enseña «Las imagenes se borran el <fecha>» en futuro, siempre, incluso
-- en una ficha de hace dos meses. Para que pueda decir «se borraron el
-- <fecha>» necesita el dato, y el tipo de retorno de una funcion no se puede
-- cambiar con `create or replace`.

drop function if exists public.admin_verificaciones(text, int, int);

create function public.admin_verificaciones(
  filtro_estado text default 'pendiente_revision',
  pagina int default 0, por_pagina int default 25
)
returns table (
  id uuid, user_id uuid, handle text, nombre text, email text,
  estado text, similitud numeric, paso_fallido text, motivo text,
  edad int, fecha_nacimiento date,
  ine_path text, selfie_path text, borrar_despues_de timestamptz,
  imagenes_borradas_at timestamptz,
  revisada_por uuid, revisada_at timestamptz, nota_revision text,
  created_at timestamptz,
  identidad_verificada boolean, intentos int,
  tiene_expediente boolean, clips_pendientes int, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select v.id, v.user_id, p.handle, p.display_name as nombre, u.email::text,
           v.estado::text as estado, v.similitud, v.paso_fallido, v.motivo,
           v.edad, v.fecha_nacimiento,
           v.ine_path, v.selfie_path, v.borrar_despues_de,
           v.imagenes_borradas_at,
           v.revisada_por, v.revisada_at, v.nota_revision, v.created_at,
           p.identidad_verificada,
           (select count(*)::int from public.intentos_verificacion i where i.user_id = v.user_id),
           exists (select 1 from public.expedientes e where e.user_id = v.user_id),
           (select count(*)::int from public.clips c
             where c.creator_id = v.user_id and c.estado = 'pendiente')
      from public.verificaciones v
      join public.profiles p on p.id = v.user_id
      join auth.users u on u.id = v.user_id
     where public.es_admin()
       and (filtro_estado = '' or v.estado::text = filtro_estado)
  )
  select b.*, count(*) over () from base b
   order by b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_verificaciones(text,int,int) from public, anon;
grant execute on function public.admin_verificaciones(text,int,int) to authenticated;

comment on table public.verificaciones is
  'Solicitudes de verificacion. Las imagenes viven en un bucket privado que solo lee la administracion; `borrar_despues_de` es cuando dejan de conservarse e `imagenes_borradas_at` cuando se borraron de verdad. De la persona solo queda el booleano y la fecha.';
