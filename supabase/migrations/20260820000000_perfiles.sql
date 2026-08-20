-- Perfiles de usuario.
--
-- Contexto de seguridad: la app es estatica y el repo es publico, asi que la
-- anon key esta a la vista de cualquiera. No hay servidor intermedio que filtre
-- nada: RLS es lo unico que separa "mis datos" de "los datos de todos". Por eso
-- cada tabla nace con RLS activo y con sus politicas en la misma migracion.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,

  -- Nombre artistico. Es lo unico visible en toda la plataforma; el nombre
  -- legal no se guarda aqui ni en ninguna tabla accesible desde el cliente.
  handle        text not null unique
                check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name  text not null check (char_length(display_name) between 1 and 40),
  bio           text check (char_length(bio) <= 300),
  avatar_path   text,

  is_creator    boolean not null default false,
  verified      boolean not null default false,

  -- Confirmacion de mayoria de edad. Es la autodeclaracion del age gate, no una
  -- verificacion de identidad: sirve como registro de que se mostro la puerta,
  -- no como prueba legal de edad.
  adult_confirmed_at timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.profiles.verified is
  'Insignia de verificacion. Solo se otorga desde el servidor: el cliente no puede escribirla (ver politica profiles_update_propio).';

create index profiles_creator_idx on public.profiles (is_creator) where is_creator;

alter table public.profiles enable row level security;

-- Lectura: los perfiles son publicos. Es un directorio de creadoras; que un
-- perfil se pueda ver es justamente el punto. Nada sensible vive en esta tabla.
create policy profiles_select_publico
  on public.profiles for select
  using (true);

-- Escritura: cada quien solo su propia fila. El insert lo hace el trigger de
-- abajo, pero la politica se declara igual por si algun dia se inserta desde
-- el cliente.
create policy profiles_insert_propio
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy profiles_update_propio
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sin politica de delete a proposito: borrar la cuenta pasa por auth.users,
-- y el on delete cascade se lleva el perfil. Asi no hay forma de dejar un
-- usuario huerfano sin perfil desde el cliente.

-- Blindaje de columnas privilegiadas. RLS decide QUE filas puede tocar alguien,
-- no QUE columnas: sin esto, un usuario podria ponerse verified = true el mismo.
create or replace function public.profiles_proteger_columnas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.verified   := old.verified;
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_proteger_columnas
  before update on public.profiles
  for each row execute function public.profiles_proteger_columnas();

-- Alta automatica del perfil al crearse el usuario. Se hace con trigger y no
-- desde el cliente para que no exista jamas un usuario sin perfil: si la app
-- fallara justo despues del registro, la fila ya quedo escrita.
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

  insert into public.profiles (id, handle, display_name)
  values (new.id, intento, intento);

  return new;
end;
$$;

create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario();
