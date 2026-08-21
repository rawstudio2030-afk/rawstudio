-- Resultado de la verificacion de edad e identidad.
--
-- Lo que NO esta aqui es tan importante como lo que si: no hay foto del INE, no
-- hay selfie, no hay CURP, no hay nombre legal. El microservicio procesa todo
-- eso en memoria y solo devuelve el veredicto. Es lo que promete la pagina de
-- creadoras —"guardamos un hash, no tu cara"— y ademas reduce el daño de una
-- filtracion a cero para el dato sensible.

alter table public.profiles
  add column identidad_verificada boolean not null default false,
  add column identidad_verificada_at timestamptz,
  -- Hash de la CURP, no la CURP. Sirve para detectar que una misma persona
  -- abrio dos cuentas sin poder reconstruir quien es.
  add column curp_hash text;

create unique index profiles_curp_hash_idx on public.profiles (curp_hash)
  where curp_hash is not null;

comment on column public.profiles.identidad_verificada is
  'Veredicto del microservicio. El usuario NO puede escribirlo (ver trigger de blindaje): si pudiera, la verificacion seria decorativa.';
comment on column public.profiles.curp_hash is
  'SHA-256 de la CURP. Permite detectar cuentas duplicadas sin guardar el dato identificable.';

-- El blindaje se amplia: la verificacion de identidad es tan privilegiada como
-- la insignia o la suspension.
create or replace function public.profiles_proteger_columnas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not public.es_admin() then
    new.verified                := old.verified;
    new.suspended_at            := old.suspended_at;
    new.suspended_reason        := old.suspended_reason;
    new.identidad_verificada    := old.identidad_verificada;
    new.identidad_verificada_at := old.identidad_verificada_at;
    new.curp_hash               := old.curp_hash;
  end if;

  return new;
end;
$$;

-- Bitacora de intentos, sin datos personales. Sirve para detectar abuso —mismo
-- usuario probando decenas de credenciales— sin guardar nada de lo probado.
create table public.intentos_verificacion (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  exito       boolean not null,
  paso_fallido text,          -- 'curp' | 'edad' | 'ine' | 'rostro' | 'geo'
  similitud   numeric(5,4),
  created_at  timestamptz not null default now()
);

create index intentos_usuario_idx on public.intentos_verificacion (user_id, created_at desc);

alter table public.intentos_verificacion enable row level security;

create policy intentos_select on public.intentos_verificacion for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Solo el servicio, con service_role, escribe aqui. El cliente no puede
-- declararse verificado.
