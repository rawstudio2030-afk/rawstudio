-- Trato de genero: como se le habla a cada persona.
--
-- Se registra desde el alta: mujer, hombre, neutro o prefiere no decirlo. Solo
-- sirve para escribirle a ESA persona con las palabras que prefiere
-- («creadora» / «creador» / «quien publica»); no es un dato de la ficha.
--
-- - La columna NO se agrega a ningun permiso de lectura de `profiles` (solo hay
--   permisos por columna): ni anon ni authenticated pueden leerla con SELECT,
--   y la politica de lectura de filas es publica. Cada quien la lee con
--   `mi_trato()`; administracion con `admin_trato_de(uid)`.
-- - Nulo = cuenta anterior a este cambio, o que no eligio: se trata como neutro.
-- - Se escribe cada quien la suya (politica de actualizacion de siempre, o
--   `guardar_trato`, que ademas valida).
-- - En el alta llega en los metadatos del registro; el disparador que crea el
--   perfil solo lo acepta si es uno de los cuatro valores, y si no lo deja nulo.
-- - Al anonimizar una cuenta se borra: ya no hay a quien tratar.

alter table public.profiles
  add column if not exists trato text
  check (trato is null or trato in ('mujer', 'hombre', 'neutro', 'no_decir'));

comment on column public.profiles.trato is
  'Como prefiere que se le trate: mujer | hombre | neutro | no_decir. Privada: se lee con mi_trato() o admin_trato_de().';

-- ---------- Alta: lo toma de los metadatos del registro ----------

create or replace function public.crear_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  intento text;
  n int := 0;
  elegido text := new.raw_user_meta_data ->> 'trato';
begin
  -- Handle provisional a partir del correo, saneado al formato permitido.
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then
    base := 'user' || base;
  end if;
  base := left(base, 20);

  intento := base;
  while exists (select 1 from public.profiles where handle = intento) loop
    n := n + 1;
    intento := left(base, 20) || n::text;
  end loop;

  if elegido is null or elegido not in ('mujer', 'hombre', 'neutro', 'no_decir') then
    elegido := null;
  end if;

  insert into public.profiles (id, handle, display_name, trato)
  values (new.id, intento, intento, elegido);

  return new;
end;
$$;

-- ---------- Leer y cambiar el propio ----------

create or replace function public.mi_trato()
returns text language sql stable security definer set search_path = '' as $$
  select p.trato from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.mi_trato() from public, anon;
grant execute on function public.mi_trato() to authenticated;

create or replace function public.guardar_trato(p_trato text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  if p_trato is null or p_trato not in ('mujer', 'hombre', 'neutro', 'no_decir') then
    raise exception 'Elige una de las cuatro opciones';
  end if;
  update public.profiles set trato = p_trato where id = auth.uid();
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.guardar_trato(text) from public, anon;
grant execute on function public.guardar_trato(text) to authenticated;

-- ---------- Administracion ----------

create or replace function public.admin_trato_de(p_uid uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo administracion' using errcode = 'insufficient_privilege';
  end if;
  return (select p.trato from public.profiles p where p.id = p_uid);
end; $$;
revoke all on function public.admin_trato_de(uuid) from public, anon;
grant execute on function public.admin_trato_de(uuid) to authenticated;

-- ---------- Al anonimizar, se borra ----------

create or replace function public.trato_se_borra_al_anonimizar()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.anonimizada_at is not null then new.trato := null; end if;
  return new;
end; $$;

drop trigger if exists profiles_trato_anonimizar on public.profiles;
create trigger profiles_trato_anonimizar
  before update on public.profiles
  for each row execute function public.trato_se_borra_al_anonimizar();
