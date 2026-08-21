-- Cuatro modalidades de monetizacion conviviendo.
--
-- El problema central no son las tablas, es el ACCESO: a partir de aqui un clip
-- se puede abrir por compra, por renta vigente, por suscripcion activa, por ser
-- gratis o por ser tuyo. Cinco caminos. Si esa logica se copia en cada politica
-- y en cada pantalla, tarde o temprano una copia se queda atras y filtra
-- contenido pagado. Por eso todo pasa por UNA funcion.

-- ── 1 · Niveles de suscripcion ──────────────────────────────────────────────
create table public.subscription_tiers (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 40),
  descripcion text check (char_length(descripcion) <= 400),
  precio_mxn  int  not null check (precio_mxn > 0),   -- en centavos
  orden       int  not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index tiers_creador_idx on public.subscription_tiers (creator_id, orden);
alter table public.subscription_tiers enable row level security;

create policy tiers_select_publico on public.subscription_tiers for select
  using (activo or creator_id = auth.uid() or public.es_admin());
create policy tiers_escribe_propio on public.subscription_tiers for all to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy tiers_admin on public.subscription_tiers for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── 2 · Suscripciones ───────────────────────────────────────────────────────
create type public.estado_suscripcion as enum
  ('pendiente', 'activa', 'cancelada', 'vencida', 'fallida');

create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  subscriber_id  uuid not null references public.profiles (id) on delete cascade,
  creator_id     uuid not null references public.profiles (id) on delete cascade,
  tier_id        uuid references public.subscription_tiers (id) on delete set null,

  estado         public.estado_suscripcion not null default 'pendiente',
  inicio         timestamptz,
  -- Fin del periodo pagado. La vigencia se mide contra ESTO y no contra un
  -- booleano "activa": un booleano se queda mal si el cron no corre, la fecha
  -- no miente nunca.
  periodo_fin    timestamptz,
  cancela_al_fin boolean not null default false,

  -- Referencia en el procesador recurrente (CCBill u otro). Se guarda el
  -- proveedor aparte para poder migrar sin tocar el esquema.
  proveedor      text,
  proveedor_ref  text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (subscriber_id, creator_id)
);

create index subs_creador_idx on public.subscriptions (creator_id, estado);
create index subs_vigencia_idx on public.subscriptions (periodo_fin) where estado = 'activa';

alter table public.subscriptions enable row level security;

create policy subs_select on public.subscriptions for select to authenticated
  using (subscriber_id = auth.uid() or creator_id = auth.uid() or public.es_admin());
-- Sin insert ni update desde el cliente: las suscripciones nacen y mueren por
-- webhook del procesador, nunca por lo que diga el navegador.

-- ── 3 · Rentas ──────────────────────────────────────────────────────────────
alter table public.clips
  add column renta_horas int check (renta_horas is null or renta_horas in (48, 72)),
  add column renta_coins int check (renta_coins is null or renta_coins >= 0);

comment on column public.clips.renta_horas is
  'Ventana de renta en horas. Nulo = este clip no se renta.';

create table public.rentals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  clip_id     uuid not null references public.clips (id) on delete cascade,
  price_coins int  not null check (price_coins >= 0),
  inicio      timestamptz not null default now(),
  -- Se calcula al rentar y no se recalcula: si el clip cambia su ventana
  -- despues, quien ya rento conserva la que pago.
  vence       timestamptz not null,
  created_at  timestamptz not null default now()
);

create index rentals_usuario_idx on public.rentals (user_id, vence desc);
create index rentals_vigentes_idx on public.rentals (clip_id, vence);

alter table public.rentals enable row level security;

create policy rentals_select on public.rentals for select to authenticated
  using (
    user_id = auth.uid() or public.es_admin()
    or exists (select 1 from public.clips c where c.id = clip_id and c.creator_id = auth.uid())
  );

-- ── 4 · Contenido personalizado ─────────────────────────────────────────────
create type public.estado_encargo as enum (
  'propuesta',    -- la fan lo pidio
  'negociando',   -- hay contraoferta sobre la mesa
  'aceptado',     -- ambas partes de acuerdo, falta pagar
  'pagado',       -- fondos retenidos
  'en_proceso',
  'entregado',
  'rechazado',
  'cancelado'
);

create table public.custom_requests (
  id            uuid primary key default gen_random_uuid(),
  fan_id        uuid not null references public.profiles (id) on delete cascade,
  creator_id    uuid not null references public.profiles (id) on delete cascade,

  descripcion   text not null check (char_length(descripcion) between 10 and 2000),
  oferta_coins  int  not null check (oferta_coins > 0),
  -- Precio realmente acordado tras la negociacion. Distinto de la oferta
  -- inicial: guardar solo uno perderia el historial de como se llego al precio.
  acordado_coins int check (acordado_coins is null or acordado_coins > 0),

  estado        public.estado_encargo not null default 'propuesta',
  entrega_max   timestamptz,
  clip_id       uuid references public.clips (id) on delete set null,  -- lo entregado

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index encargos_creadora_idx on public.custom_requests (creator_id, estado, created_at desc);
create index encargos_fan_idx      on public.custom_requests (fan_id, created_at desc);

alter table public.custom_requests enable row level security;

create policy encargos_select on public.custom_requests for select to authenticated
  using (fan_id = auth.uid() or creator_id = auth.uid() or public.es_admin());
create policy encargos_insert_fan on public.custom_requests for insert to authenticated
  with check (
    fan_id = auth.uid() and creator_id <> auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = creator_id and p.is_creator and p.suspended_at is null)
  );

-- Hilo de negociacion: cada mensaje puede llevar una contraoferta.
create table public.custom_request_messages (
  id           bigserial primary key,
  request_id   uuid not null references public.custom_requests (id) on delete cascade,
  autor_id     uuid not null references public.profiles (id) on delete cascade,
  cuerpo       text check (char_length(cuerpo) <= 1500),
  oferta_coins int check (oferta_coins is null or oferta_coins > 0),
  created_at   timestamptz not null default now(),
  check (cuerpo is not null or oferta_coins is not null)
);

create index encargo_msgs_idx on public.custom_request_messages (request_id, created_at);

alter table public.custom_request_messages enable row level security;

create policy encargo_msgs_select on public.custom_request_messages for select to authenticated
  using (exists (
    select 1 from public.custom_requests r
    where r.id = request_id
      and (r.fan_id = auth.uid() or r.creator_id = auth.uid() or public.es_admin())
  ));

create policy encargo_msgs_insert on public.custom_request_messages for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.custom_requests r
      where r.id = request_id
        and (r.fan_id = auth.uid() or r.creator_id = auth.uid())
        and r.estado in ('propuesta', 'negociando', 'aceptado', 'pagado', 'en_proceso')
    )
  );

-- ── El acceso, en un solo lugar ─────────────────────────────────────────────
-- Cinco caminos posibles. Esta funcion es la unica autoridad; la politica de
-- storage y las pantallas la consultan en vez de reimplementarla.
create or replace function public.tiene_acceso(clip uuid, uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.clips c
    where c.id = clip and (
         c.creator_id = uid                                   -- es suyo
      or (c.published and c.visibility = 'gratis')            -- es gratis
      or exists (select 1 from public.purchases p             -- lo compro
                 where p.clip_id = clip and p.user_id = uid)
      or exists (select 1 from public.rentals r               -- renta vigente
                 where r.clip_id = clip and r.user_id = uid and r.vence > now())
      or (c.visibility = 'suscriptores' and exists (          -- suscripcion viva
            select 1 from public.subscriptions s
            where s.creator_id = c.creator_id and s.subscriber_id = uid
              and s.estado = 'activa' and s.periodo_fin > now()))
    )
  ) or public.es_admin(uid);
$$;

comment on function public.tiene_acceso is
  'Unica autoridad sobre si alguien puede ver un clip. Cualquier camino nuevo de acceso se agrega AQUI, no en las politicas ni en el frontend.';

-- La politica de storage se reduce a preguntar. Antes repetia la logica inline;
-- con cinco caminos eso se vuelve inmantenible y un descuido filtra contenido.
drop policy if exists clips_archivo_leer on storage.objects;

create policy clips_archivo_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'clips'
    and exists (
      select 1 from public.clips c
      where c.storage_path = storage.objects.name
        and public.tiene_acceso(c.id, auth.uid())
    )
  );

grant execute on function public.tiene_acceso(uuid, uuid) to authenticated;
