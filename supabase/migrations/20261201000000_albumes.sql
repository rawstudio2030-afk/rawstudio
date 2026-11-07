-- Albumes de fotos: la base.
--
-- Un album es UN CLIP MAS: mismas reglas de compra, edad, moderacion, comision,
-- geobloqueo y borrado que un video. Lo unico distinto es el contenido: en vez
-- de un video hay de 10 a 40 fotos, y el precio es fijo.
--
-- Esta migracion NO cambia lo que se ve ni lo que se puede hacer hoy: los
-- albumes quedan APAGADOS (`albumes_activos` = false) hasta que se encienda el
-- interruptor, y todo clip existente es `formato = 'video'`.
--
-- ---------- Como se modela ----------
--  - `clips.formato`: 'video' (todos los de hoy) o 'album'.
--  - `clips.num_fotos`: cuantas fotos tiene (la mantiene un disparador; el
--    catalogo la lee sin tocar la tabla de fotos).
--  - `clips.completo`: un album nace INCOMPLETO y no se puede ver hasta que su
--    autora lo completa con `album_completar`, que exige entre 10 y 40 fotos.
--    Mientras sea falso, `published` es falso aunque la moderacion lo apruebe.
--  - `album_fotos`: una fila por foto, con su ruta en el bucket privado
--    `albumes`.
--
-- ---------- Quien ve que ----------
--  - Las filas y los archivos de las fotos solo los ve quien `tiene_acceso` al
--    album (compra, autora, administracion): la MISMA funcion que protege el
--    video. Nada nuevo que pueda desincronizarse.
--  - El precio, el minimo y el maximo viven en `ajustes`, no en el codigo.
--
-- ---------- Los archivos ----------
-- Van en `albumes/<id de la autora>/<id del album>/<n>.<ext>`: la primera
-- carpeta es quien sube (la convencion de siempre) y la segunda, el album, que
-- tiene que ser de ella y estar incompleto. Una vez completo, las fotos ya no
-- se pueden agregar ni quitar desde la cuenta de la autora.
-- Quitar la metadata (GPS, datos del aparato) lo hace el cliente ANTES de
-- subir; el servidor limita tipo y tamaño pero no puede garantizar eso.

-- ---------- Ajustes ----------

insert into public.ajustes (clave, valor, nota) values
  ('albumes_activos', 'false'::jsonb,
   'Interruptor de los albumes de fotos. Apagado: nadie puede crear un album (los que existan siguen igual). Encenderlo solo cuando la subida, el visor y la moderacion de albumes esten listos.'),
  ('album_precio_coins', '500'::jsonb,
   'Precio FIJO de un album, en CENTAVOS DE DOLAR. 500 = 5 USD. Se aplica al crearlo; cambiarlo no mueve los albumes ya creados.'),
  ('album_min_fotos', '10'::jsonb, 'Minimo de fotos para poder completar (y publicar) un album.'),
  ('album_max_fotos', '40'::jsonb, 'Maximo de fotos de un album.')
on conflict (clave) do nothing;

create or replace function public.ajuste_int(p_clave text, p_defecto integer)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when jsonb_typeof(a.valor) = 'number' then (a.valor)::text::int end
       from public.ajustes a where a.clave = p_clave),
    p_defecto);
$$;
revoke all on function public.ajuste_int(text, integer) from public, anon, authenticated;

-- ---------- Columnas de clips ----------

alter table public.clips
  add column if not exists formato text not null default 'video'
    check (formato in ('video', 'album')),
  add column if not exists num_fotos integer not null default 0 check (num_fotos >= 0),
  add column if not exists completo boolean not null default true;

comment on column public.clips.formato is
  'video (lo de siempre) o album (de 10 a 40 fotos, precio fijo). No cambia despues de crearse.';
comment on column public.clips.num_fotos is
  'Fotos del album. La mantiene un disparador sobre album_fotos; 0 en un video.';
comment on column public.clips.completo is
  'Un album nace incompleto y solo se ve cuando su autora lo completa con album_completar (entre el minimo y el maximo de fotos). Un video es siempre completo.';

-- Permisos por columna (como el resto de `clips`): el catalogo necesita saber el
-- formato y cuantas fotos son; quien entro, ademas, si su album esta completo.
grant select (formato, num_fotos) on public.clips to anon, authenticated;
grant select (completo) on public.clips to authenticated;
-- La autora decide el formato al crear; num_fotos y completo NO las escribe ella.
grant insert (formato) on public.clips to authenticated;

-- ---------- Reglas de un album al crearlo ----------

create or replace function public.clips_album_reglas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    -- El formato no cambia despues de creado, ni se puede completar por fuera
    -- de `album_completar`.
    new.formato := old.formato;
    if new.formato = 'album' and new.completo is distinct from old.completo
       and coalesce(current_setting('rawstudio.album_completando', true), '') <> 'si' then
      new.completo := old.completo;
    end if;
    return new;
  end if;

  if new.formato = 'album' then
    if not public.ajuste_bool('albumes_activos') then
      raise exception 'Los albumes de fotos todavia no estan disponibles';
    end if;
    new.visibility    := 'pago';
    new.price_coins   := public.ajuste_int('album_precio_coins', 500);
    new.renta_horas   := null;
    new.renta_coins   := null;
    new.storage_path  := null;
    new.preview_path  := null;
    new.caduca_at     := null;
    new.num_fotos     := 0;
    new.completo      := false;
  else
    new.num_fotos := 0;
    new.completo  := true;
  end if;
  return new;
end; $$;
revoke all on function public.clips_album_reglas() from public, anon, authenticated;

drop trigger if exists clips_album_reglas on public.clips;
create trigger clips_album_reglas
  before insert or update on public.clips
  for each row execute function public.clips_album_reglas();

-- Un album incompleto NO se ve, aunque la moderacion lo apruebe. Va con un
-- nombre que ordena DESPUES de `clips_publicar_alta` (los disparadores del mismo
-- evento corren en orden alfabetico) para tener la ultima palabra sobre
-- `published`.
create or replace function public.clips_zalbum_completo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.formato = 'album' and not new.completo then
    new.published := false;
    new.published_at := null;
  end if;
  return new;
end; $$;
revoke all on function public.clips_zalbum_completo() from public, anon, authenticated;

drop trigger if exists clips_zalbum_completo on public.clips;
create trigger clips_zalbum_completo
  before insert or update on public.clips
  for each row execute function public.clips_zalbum_completo();

-- ---------- Las fotos ----------

create table public.album_fotos (
  id         uuid primary key default gen_random_uuid(),
  clip_id    uuid not null references public.clips (id) on delete cascade,
  orden      integer not null check (orden >= 1),
  ruta       text not null,
  ancho      integer check (ancho is null or ancho between 1 and 20000),
  alto       integer check (alto is null or alto between 1 and 20000),
  bytes      integer check (bytes is null or bytes > 0),
  created_at timestamptz not null default now(),
  unique (clip_id, orden)
);
create index album_fotos_clip_idx on public.album_fotos (clip_id, orden);

comment on column public.album_fotos.ruta is
  'Ruta dentro del bucket privado «albumes»: <autora>/<album>/<n>.<ext>.';

alter table public.album_fotos enable row level security;
revoke all on public.album_fotos from anon, authenticated;
grant select, insert, delete on public.album_fotos to authenticated;

-- Ver las fotos: la misma regla que el video.
create policy album_fotos_ver on public.album_fotos for select to authenticated
  using (public.tiene_acceso(clip_id, auth.uid()));

-- Agregar y quitar: solo la autora, en su album, mientras este incompleto.
create policy album_fotos_agregar on public.album_fotos for insert to authenticated
  with check (exists (
    select 1 from public.clips c
     where c.id = clip_id and c.creator_id = auth.uid() and c.formato = 'album'
       and not c.completo and c.borrado_at is null));
create policy album_fotos_quitar on public.album_fotos for delete to authenticated
  using (exists (
    select 1 from public.clips c
     where c.id = clip_id and c.creator_id = auth.uid() and c.formato = 'album'
       and not c.completo and c.borrado_at is null));

-- La ruta tiene que ser <autora>/<album>/<archivo>, y el maximo se respeta.
create or replace function public.album_fotos_reglas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare autora uuid; cuantas int;
begin
  select c.creator_id into autora from public.clips c where c.id = new.clip_id;
  if new.ruta not like autora::text || '/' || new.clip_id::text || '/%' then
    raise exception 'La foto tiene que estar en la carpeta de su album';
  end if;
  select count(*) into cuantas from public.album_fotos f where f.clip_id = new.clip_id;
  if cuantas >= public.ajuste_int('album_max_fotos', 40) then
    raise exception 'Un album admite como maximo % fotos', public.ajuste_int('album_max_fotos', 40);
  end if;
  return new;
end; $$;
revoke all on function public.album_fotos_reglas() from public, anon, authenticated;

drop trigger if exists album_fotos_reglas on public.album_fotos;
create trigger album_fotos_reglas
  before insert on public.album_fotos
  for each row execute function public.album_fotos_reglas();

-- num_fotos siempre sale de contar, no de lo que diga alguien.
create or replace function public.album_fotos_cuenta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare alb uuid := coalesce(new.clip_id, old.clip_id);
begin
  update public.clips set num_fotos = (select count(*) from public.album_fotos f where f.clip_id = alb)
   where id = alb;
  return null;
end; $$;
revoke all on function public.album_fotos_cuenta() from public, anon, authenticated;

drop trigger if exists album_fotos_cuenta on public.album_fotos;
create trigger album_fotos_cuenta
  after insert or delete on public.album_fotos
  for each row execute function public.album_fotos_cuenta();

-- ---------- Completar el album ----------
-- La unica via a `completo = true`. Exige el minimo de fotos y las mismas
-- condiciones que subir un clip (creadora verificada y cuenta activa). Despues
-- de esto, la moderacion decide si se ve: igual que un video.

create or replace function public.album_completar(p_clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid(); c public.clips; minimo int; maximo int; publicado boolean;
begin
  if yo is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  if not public.cuenta_activa(yo) then
    raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion';
  end if;
  if not exists (select 1 from public.profiles p
                  where p.id = yo and p.is_creator and p.identidad_verificada) then
    raise exception 'Para publicar tienes que ser creadora con la identidad verificada';
  end if;

  select * into c from public.clips where id = p_clip;
  if c.id is null or c.creator_id <> yo or c.formato <> 'album' or c.borrado_at is not null then
    raise exception 'Ese album no existe';
  end if;
  if c.completo then raise exception 'Ese album ya esta completo'; end if;

  minimo := public.ajuste_int('album_min_fotos', 10);
  maximo := public.ajuste_int('album_max_fotos', 40);
  if c.num_fotos < minimo then
    raise exception 'Faltan fotos: un album necesita al menos % y tiene %', minimo, c.num_fotos;
  end if;
  if c.num_fotos > maximo then
    raise exception 'Sobran fotos: un album admite como maximo %', maximo;
  end if;

  perform set_config('rawstudio.album_completando', 'si', true);
  update public.clips set completo = true where id = p_clip;
  perform set_config('rawstudio.album_completando', '', true);

  select cl.published into publicado from public.clips cl where cl.id = p_clip;
  return jsonb_build_object('ok', true, 'fotos', c.num_fotos, 'publicado', publicado);
end; $$;
revoke all on function public.album_completar(uuid) from public, anon;
grant execute on function public.album_completar(uuid) to authenticated;

-- ---------- Archivos: el bucket privado ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('albumes', 'albumes', false, 10 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leer: quien tiene acceso al album (compra, autora, administracion).
create policy albumes_leer on storage.objects for select to authenticated
  using (bucket_id = 'albumes' and exists (
    select 1 from public.album_fotos f
     where f.ruta = objects.name and public.tiene_acceso(f.clip_id, auth.uid())));

-- Subir y quitar: la autora, dentro de SU carpeta y del album que sigue incompleto.
create policy albumes_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'albumes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.clips c
                 where c.id::text = (storage.foldername(name))[2]
                   and c.creator_id = auth.uid() and c.formato = 'album'
                   and not c.completo and c.borrado_at is null));

create policy albumes_quitar_propio on storage.objects for delete to authenticated
  using (
    bucket_id = 'albumes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.clips c
                 where c.id::text = (storage.foldername(name))[2]
                   and c.creator_id = auth.uid() and c.formato = 'album'
                   and not c.completo));

-- Administracion borra (purga, eliminar cuenta) cualquier album, sin importar de
-- quien sea. NO se limita a cuentas con expediente.
create policy albumes_admin_borra on storage.objects for delete to authenticated
  using (bucket_id = 'albumes' and public.es_admin());
