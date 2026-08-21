-- Los canales de ingreso que faltaban: shows en vivo, blog, mensajes y propinas.
--
-- Hasta ahora una creadora solo podia publicar un clip, aunque la plataforma
-- promete siete formas de ganar. Estas son las tres que ni siquiera tenian
-- tabla.

-- ── Blog ────────────────────────────────────────────────────────────────────
create type public.visibilidad_post as enum ('publico', 'suscriptores');

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 1 and 120),
  cuerpo      text not null check (char_length(cuerpo) between 1 and 20000),
  cover_path  text,
  -- A proposito no hay post de pago individual todavia: la compra suelta esta
  -- amarrada a clips, y generalizarla es un cambio mayor. Publico o para
  -- suscriptoras cubre el uso real de un blog.
  visibilidad public.visibilidad_post not null default 'publico',
  publicado   boolean not null default false,
  publicado_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index posts_creadora_idx on public.posts (creator_id, publicado_at desc);
alter table public.posts enable row level security;

create policy posts_select on public.posts for select
  using (
    creator_id = auth.uid() or public.es_admin()
    or (publicado and visibilidad = 'publico')
    or (publicado and visibilidad = 'suscriptores' and exists (
          select 1 from public.subscriptions s
          where s.creator_id = posts.creator_id and s.subscriber_id = auth.uid()
            and s.estado = 'activa' and s.periodo_fin > now()))
  );
create policy posts_escribe_propio on public.posts for all to authenticated
  using (creator_id = auth.uid()) with check (
    creator_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_creator and p.suspended_at is null)
  );
create policy posts_admin on public.posts for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Shows en vivo ───────────────────────────────────────────────────────────
create type public.estado_show  as enum ('programado', 'en_vivo', 'terminado', 'cancelado');
create type public.acceso_show  as enum ('publico', 'suscriptores', 'entrada');

create table public.live_shows (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.profiles (id) on delete cascade,
  titulo         text not null check (char_length(titulo) between 1 and 120),
  descripcion    text check (char_length(descripcion) <= 800),
  cover_path     text,

  programado_para timestamptz not null,
  iniciado_at    timestamptz,
  terminado_at   timestamptz,
  estado         public.estado_show not null default 'programado',

  acceso         public.acceso_show not null default 'publico',
  entrada_coins  int not null default 0 check (entrada_coins >= 0),

  -- La transmision la sirve un proveedor externo (Mux, Livekit, Whereby). Aqui
  -- solo se guarda la referencia: montar video en vivo propio es otro proyecto.
  sala_url       text,

  created_at     timestamptz not null default now()
);

create index shows_creadora_idx on public.live_shows (creator_id, programado_para desc);
create index shows_proximos_idx on public.live_shows (programado_para)
  where estado in ('programado', 'en_vivo');

alter table public.live_shows enable row level security;

create policy shows_select on public.live_shows for select using (true);
create policy shows_escribe_propio on public.live_shows for all to authenticated
  using (creator_id = auth.uid()) with check (
    creator_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.is_creator and p.suspended_at is null)
  );
create policy shows_admin on public.live_shows for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create table public.show_tickets (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid not null references public.live_shows (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  price_coins int not null check (price_coins >= 0),
  created_at  timestamptz not null default now(),
  unique (show_id, user_id)
);

alter table public.show_tickets enable row level security;
create policy tickets_select on public.show_tickets for select to authenticated
  using (
    user_id = auth.uid() or public.es_admin()
    or exists (select 1 from public.live_shows s where s.id = show_id and s.creator_id = auth.uid())
  );

-- ── Mensajes ────────────────────────────────────────────────────────────────
-- Una conversacion por par de personas. Se guarda ordenado (menor, mayor) para
-- que el par sea unico sin importar quien escribio primero.
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  a_id       uuid not null references public.profiles (id) on delete cascade,
  b_id       uuid not null references public.profiles (id) on delete cascade,
  ultimo_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (a_id < b_id),
  unique (a_id, b_id)
);

create index conv_a_idx on public.conversations (a_id, ultimo_at desc);
create index conv_b_idx on public.conversations (b_id, ultimo_at desc);

alter table public.conversations enable row level security;
create policy conv_select on public.conversations for select to authenticated
  using (a_id = auth.uid() or b_id = auth.uid() or public.es_admin());

create table public.messages (
  id              bigserial primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  cuerpo          text check (char_length(cuerpo) <= 2000),
  -- Mensaje con contenido de pago: el archivo va en bucket privado y solo se
  -- entrega a quien lo desbloquea.
  media_path      text,
  precio_coins    int not null default 0 check (precio_coins >= 0),
  created_at      timestamptz not null default now(),
  check (cuerpo is not null or media_path is not null)
);

create index msgs_conv_idx on public.messages (conversation_id, created_at desc);

alter table public.messages enable row level security;

create policy msgs_select on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.a_id = auth.uid() or c.b_id = auth.uid() or public.es_admin())
  ));

create policy msgs_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (c.a_id = auth.uid() or c.b_id = auth.uid()))
  );

create table public.message_unlocks (
  message_id  bigint not null references public.messages (id) on delete cascade,
  user_id     uuid   not null references public.profiles (id) on delete cascade,
  price_coins int not null check (price_coins >= 0),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_unlocks enable row level security;
create policy unlocks_select on public.message_unlocks for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- ── Propinas ────────────────────────────────────────────────────────────────
-- El movimiento de dinero vive en coin_ledger; esta tabla guarda el CONTEXTO:
-- de quien a quien, con que mensaje y en que momento. El libro solo sabe que
-- entraron coins, no que fue un gesto hacia alguien.
create type public.contexto_propina as enum ('perfil', 'clip', 'show', 'mensaje');

create table public.tips (
  id          uuid primary key default gen_random_uuid(),
  de_id       uuid not null references public.profiles (id) on delete cascade,
  para_id     uuid not null references public.profiles (id) on delete cascade,
  coins       int  not null check (coins > 0),
  mensaje     text check (char_length(mensaje) <= 300),
  contexto    public.contexto_propina not null default 'perfil',
  ref_id      uuid,
  created_at  timestamptz not null default now(),
  check (de_id <> para_id)
);

create index tips_para_idx on public.tips (para_id, created_at desc);

alter table public.tips enable row level security;
create policy tips_select on public.tips for select to authenticated
  using (de_id = auth.uid() or para_id = auth.uid() or public.es_admin());

-- Dar propina mueve dinero, asi que va por funcion y no por politica.
create or replace function public.dar_propina(
  para uuid, cantidad int, texto text default null,
  ctx public.contexto_propina default 'perfil', referencia uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  mi_saldo int;
  comision int;
  neto int;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;
  if para = yo then raise exception 'No puedes darte propina a ti misma'; end if;
  if cantidad <= 0 then raise exception 'La propina debe ser mayor a cero'; end if;

  mi_saldo := public.saldo(yo);
  if mi_saldo < cantidad then
    raise exception 'Te faltan % coins', cantidad - mi_saldo;
  end if;

  comision := round(cantidad * 0.20);
  neto     := cantidad - comision;

  insert into public.tips (de_id, para_id, coins, mensaje, contexto, ref_id)
  values (yo, para, cantidad, texto, ctx, referencia);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo,  -cantidad, 'propina', referencia, yo, texto),
         (para, neto,     'propina', referencia, yo, texto);

  return jsonb_build_object('ok', true, 'saldo', public.saldo(yo), 'recibio', neto);
end;
$$;

revoke all on function public.dar_propina(uuid, int, text, public.contexto_propina, uuid) from public, anon;
grant execute on function public.dar_propina(uuid, int, text, public.contexto_propina, uuid) to authenticated;
