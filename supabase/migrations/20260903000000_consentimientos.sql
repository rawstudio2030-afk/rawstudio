-- Registro de consentimientos.
--
-- Un "acepto" que no queda registrado no sirve como prueba. Se guarda por cada
-- persona: que documento acepto, EN QUE VERSION, cuando, desde que IP y que
-- casillas marco.
--
-- La version importa mas de lo que parece: si los terminos cambian, hay que
-- poder demostrar cual acepto cada quien, no solo que acepto "los terminos".

create type public.tipo_consentimiento as enum (
  'terminos',        -- terminos y condiciones
  'privacidad',      -- aviso de privacidad
  'biometricos',     -- tratamiento de datos biometricos (expreso y separado)
  'recomendaciones', -- opcional
  'promociones'      -- opcional
);

create table public.consentimientos (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tipo        public.tipo_consentimiento not null,
  version     text not null,        -- 'v1.0', 'v1.1'...
  otorgado    boolean not null,     -- false = lo nego o lo revoco
  ip          inet,
  agente      text,
  created_at  timestamptz not null default now()
);

create index consent_usuario_idx on public.consentimientos (user_id, tipo, created_at desc);

alter table public.consentimientos enable row level security;

create policy consent_select on public.consentimientos for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Se puede insertar lo propio, pero NUNCA editar ni borrar: un registro de
-- consentimiento que se puede alterar despues no prueba nada.
create policy consent_insert_propio on public.consentimientos for insert to authenticated
  with check (user_id = auth.uid());

-- Version vigente de cada documento. Al publicar una nueva, se agrega fila; no
-- se edita la anterior, porque hay gente que acepto esa.
create table public.documentos_legales (
  tipo        public.tipo_consentimiento primary key,
  version     text not null,
  vigente_desde date not null default current_date,
  url         text
);

alter table public.documentos_legales enable row level security;
create policy docs_lectura on public.documentos_legales for select using (true);

insert into public.documentos_legales (tipo, version, url) values
  ('terminos',    'v1.0', '/terminos'),
  ('privacidad',  'v1.0', '/privacidad'),
  ('biometricos', 'v1.0', '/privacidad')
on conflict (tipo) do nothing;

-- Consulta util para el panel: quien acepto que y cuando.
create or replace function public.consentimientos_de(objetivo uuid)
returns table (tipo public.tipo_consentimiento, version text, otorgado boolean, cuando timestamptz)
language sql stable security definer set search_path = ''
as $$
  select distinct on (c.tipo) c.tipo, c.version, c.otorgado, c.created_at
  from public.consentimientos c
  where c.user_id = objetivo
    and (objetivo = auth.uid() or public.es_admin())
  order by c.tipo, c.created_at desc;
$$;

grant execute on function public.consentimientos_de(uuid) to authenticated;
