-- Modulo 2: moderacion de clips. Y con el, la tabla de reportes, que en la
-- especificacion es el Modulo 7.
--
-- POR QUE SE ADELANTAN LOS REPORTES: una de las reglas de moderacion es que
-- un clip con tres reportes se despublique solo. Sin tabla de reportes ese
-- disparador no podria dispararse nunca: seria una regla escrita que no
-- existe. Se construye la tabla ahora y la cola de atencion queda para el
-- Modulo 7.

-- ---------- Estado de un clip ----------

do $$ begin
  create type public.estado_clip as enum ('pendiente','aprobado','rechazado','retirado');
exception when duplicate_object then null; end $$;

alter table public.clips
  add column if not exists estado         public.estado_clip,
  add column if not exists motivo_rechazo text,
  add column if not exists revisado_por   uuid references public.profiles (id),
  add column if not exists revisado_at    timestamptz;

-- Los clips que ya existian conservan su situacion: lo publicado queda
-- aprobado, lo demas pendiente. Nadie pierde visibilidad por esta migracion.
-- El CASE devuelve texto; sin el cast explicito Postgres rechaza el enum.
update public.clips
   set estado = (case when published then 'aprobado' else 'pendiente' end)::public.estado_clip
 where estado is null;
alter table public.clips alter column estado set default 'pendiente';
alter table public.clips alter column estado set not null;

comment on column public.clips.estado is
  'Fuente de verdad de la visibilidad. La columna published se mantiene sola a partir de esta (published = estado aprobado) para no romper las siete consultas que ya la usaban.';

create index if not exists clips_estado_idx on public.clips (estado, created_at desc);

-- ---------- Ajustes globales ----------

create table if not exists public.ajustes (
  clave  text primary key,
  valor  jsonb not null,
  nota   text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.ajustes enable row level security;

create policy ajustes_leer on public.ajustes for select to authenticated
  using (public.es_admin());
-- Sin politica de escritura: se cambian por funcion, que ademas anota.

insert into public.ajustes (clave, valor, nota) values
  ('moderacion_previa_forzada', 'false'::jsonb,
   'Si se enciende, TODO clip nace pendiente sin importar el historial de la creadora. Apagada por omision.')
on conflict (clave) do nothing;

create or replace function public.ajuste_bool(p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (valor)::text = 'true' from public.ajustes where clave = p_clave), false);
$$;

-- ---------- Reportes ----------

do $$ begin
  create type public.motivo_reporte as enum (
    'menor_de_edad','no_consentido','violencia','contenido_ilegal',
    'derechos_autor','spam','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_reporte as enum ('nuevo','en_revision','resuelto','desestimado');
exception when duplicate_object then null; end $$;

create table if not exists public.reportes (
  id          uuid primary key default gen_random_uuid(),
  reporta_id  uuid not null references public.profiles (id) on delete cascade,
  clip_id     uuid references public.clips (id) on delete cascade,
  perfil_id   uuid references public.profiles (id) on delete cascade,
  motivo      public.motivo_reporte not null,
  comentario  text check (char_length(comentario) <= 1000),
  estado      public.estado_reporte not null default 'nuevo',
  resuelto_por uuid references public.profiles (id),
  resuelto_at  timestamptz,
  nota_resolucion text,
  ip          inet,
  created_at  timestamptz not null default now(),
  -- Un reporte es sobre un clip o sobre un perfil, nunca sobre ambos ni
  -- sobre ninguno.
  constraint reporte_tiene_objetivo check (
    (clip_id is not null and perfil_id is null) or
    (clip_id is null and perfil_id is not null)
  ),
  -- Nadie reporta dos veces lo mismo: inflaria el contador que despublica.
  constraint reporte_unico unique (reporta_id, clip_id, perfil_id)
);

create index if not exists reportes_clip_idx   on public.reportes (clip_id) where clip_id is not null;
create index if not exists reportes_estado_idx on public.reportes (estado, created_at);

alter table public.reportes enable row level security;

-- Quien reporta puede ver lo suyo; la administracion, todo.
create policy reportes_leer on public.reportes for select to authenticated
  using (reporta_id = auth.uid() or public.es_admin());

comment on table public.reportes is
  'Reportes de usuarias sobre clips o perfiles. Se escriben por public.reportar(), no por politica: hay que sellar la IP y comprobar que el objetivo existe.';

-- La gravedad no se guarda, se deriva del motivo: si fuera una columna, dos
-- reportes del mismo motivo podrian acabar con gravedades distintas.
create or replace function public.gravedad_reporte(m public.motivo_reporte)
returns int language sql immutable set search_path = '' as $$
  select case m
    when 'menor_de_edad'    then 100
    when 'no_consentido'    then 90
    when 'contenido_ilegal' then 80
    when 'violencia'        then 60
    when 'derechos_autor'   then 40
    when 'spam'             then 20
    else 10 end;
$$;
