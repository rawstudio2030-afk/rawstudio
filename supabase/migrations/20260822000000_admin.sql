-- Administracion de la plataforma.
--
-- Principio de fondo: la app es estatica y la anon key es publica. Un panel de
-- administrador "protegido" en el cliente no protege nada —cualquiera edita el
-- JavaScript—. Lo que hace admin a alguien vive en la base y se comprueba en
-- cada politica, del lado del servidor.

-- ── Quien es admin ──────────────────────────────────────────────────────────
-- Tabla aparte, y NO una columna en profiles. Una columna del propio perfil
-- viaja en cada update del usuario y basta un descuido en el trigger de
-- blindaje para que alguien se ascienda solo. Aqui no hay politica de insert,
-- update ni delete: desde el cliente es imposible escribir, con cualquier
-- llave. Se da de alta a mano desde el panel de Supabase o por SQL.
create table public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  nota     text,
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Un admin puede ver quienes son admins. Nadie mas ve la tabla, y nadie la
-- escribe desde el cliente.
create policy admins_select_solo_admins
  on public.admins for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- security definer para que la funcion pueda leer public.admins sin que el
-- usuario tenga permiso directo; stable para que el planificador la reuse
-- dentro de una misma consulta en vez de evaluarla por fila.
create or replace function public.es_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

comment on function public.es_admin is
  'Verdadero si el usuario es administrador. Se usa dentro de las politicas RLS; nunca confiar en un equivalente calculado en el cliente.';

-- ── Bitacora ────────────────────────────────────────────────────────────────
-- Quien puede editar perfiles y mover saldos necesita dejar rastro. Sin esto
-- no hay forma de responder "quien borro esto y cuando", que es justo lo que
-- se pregunta cuando algo sale mal.
create table public.admin_log (
  id          bigserial primary key,
  admin_id    uuid not null references auth.users (id),
  accion      text not null,
  objetivo    uuid references auth.users (id),
  detalle     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_log_objetivo_idx on public.admin_log (objetivo, created_at desc);
create index admin_log_fecha_idx    on public.admin_log (created_at desc);

alter table public.admin_log enable row level security;

create policy admin_log_select_admins
  on public.admin_log for select
  to authenticated
  using (public.es_admin());

-- Solo se puede escribir a nombre propio: un admin no puede fabricar entradas
-- atribuidas a otro.
create policy admin_log_insert_admins
  on public.admin_log for insert
  to authenticated
  with check (public.es_admin() and admin_id = auth.uid());

-- Sin politicas de update ni delete, a proposito: la bitacora es inmutable.
-- Si se pudiera editar, no serviria como bitacora.

-- ── Suspension de cuentas ───────────────────────────────────────────────────
alter table public.profiles
  add column suspended_at     timestamptz,
  add column suspended_reason text;

comment on column public.profiles.suspended_at is
  'Marcado por un admin. El propio usuario no puede modificarlo (ver trigger de blindaje).';

create index profiles_suspendidos_idx on public.profiles (suspended_at)
  where suspended_at is not null;

-- ── Politicas de admin sobre perfiles ───────────────────────────────────────
-- El select ya era publico. Falta que un admin pueda editar cualquier perfil.
create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ── Blindaje de columnas, ahora consciente del admin ────────────────────────
-- El trigger anterior revertia verified SIEMPRE, lo que tambien habria
-- bloqueado al admin. Ahora distingue: el usuario comun no puede tocar las
-- columnas privilegiadas; el admin si.
create or replace function public.profiles_proteger_columnas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nunca, para nadie: la identidad y el alta no se reescriben.
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not public.es_admin() then
    new.verified         := old.verified;
    new.suspended_at     := old.suspended_at;
    new.suspended_reason := old.suspended_reason;
  end if;

  return new;
end;
$$;
