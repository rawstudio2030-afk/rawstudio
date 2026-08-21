-- Monedero y compras.
--
-- Decision de fondo: el dinero es un LIBRO CONTABLE, no un campo con el saldo.
-- Una fila por movimiento, y el saldo se deriva de la suma. Un campo mutable se
-- puede quedar mal por una condicion de carrera o por un ajuste sin explicacion,
-- y despues no hay forma de saber que paso. Con asientos, cada coin tiene
-- origen: quien lo puso, cuando y por que.

create type public.motivo_movimiento as enum (
  'recarga',          -- la usuaria compro coins
  'compra_clip',      -- pago por desbloquear (negativo)
  'venta_clip',       -- lo que recibe la creadora (positivo)
  'propina',
  'ajuste_admin',     -- correccion manual, siempre con nota
  'reembolso'
);

create table public.coin_ledger (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  delta       int  not null check (delta <> 0),
  motivo      public.motivo_movimiento not null,
  ref_id      uuid,                       -- clip, compra o mensaje relacionado
  nota        text,
  creado_por  uuid references auth.users (id),  -- quien lo origino; admin en ajustes
  created_at  timestamptz not null default now()
);

create index ledger_usuario_idx on public.coin_ledger (user_id, created_at desc);

alter table public.coin_ledger enable row level security;

-- Cada quien ve sus movimientos; un admin ve todos.
create policy ledger_select_propio
  on public.coin_ledger for select
  to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Sin politica de insert, update ni delete a proposito: el saldo solo se mueve
-- por las funciones de abajo, que validan y dejan rastro. Si el cliente pudiera
-- insertar, cualquiera se regalaria coins con la llave publica.

create or replace function public.saldo(uid uuid default auth.uid())
returns int
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(delta), 0)::int from public.coin_ledger where user_id = uid;
$$;

-- ── Compras ─────────────────────────────────────────────────────────────────
create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  clip_id     uuid not null references public.clips (id) on delete cascade,
  price_coins int  not null check (price_coins >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, clip_id)      -- "desbloquear para siempre" se paga una vez
);

create index purchases_clip_idx on public.purchases (clip_id, created_at desc);

alter table public.purchases enable row level security;

-- La compradora ve lo suyo; la creadora ve quien compro sus clips (lo necesita
-- para sus ganancias); el admin ve todo.
create policy purchases_select
  on public.purchases for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.clips c
               where c.id = clip_id and c.creator_id = auth.uid())
  );

-- Igual que el libro: nada de insertar desde el cliente.

-- ── Comprar un clip ─────────────────────────────────────────────────────────
-- Todo en una transaccion: o se cobra Y se registra la compra Y se le abona a
-- la creadora, o no pasa nada. A medias seria cobrar sin entregar.
create or replace function public.comprar_clip(clip uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c        public.clips;
  yo       uuid := auth.uid();
  mi_saldo int;
  para_ella int;
  comision int;
begin
  if yo is null then
    raise exception 'Necesitas entrar para comprar' using errcode = 'insufficient_privilege';
  end if;

  select * into c from public.clips where id = clip;
  if c.id is null then raise exception 'Ese clip no existe'; end if;
  if not c.published then raise exception 'Ese clip no está publicado'; end if;
  if c.creator_id = yo then raise exception 'Es tuyo, no necesitas comprarlo'; end if;
  if c.visibility <> 'pago' then raise exception 'Ese clip no se vende por separado'; end if;

  if exists (select 1 from public.purchases where user_id = yo and clip_id = clip) then
    raise exception 'Ya lo tienes desbloqueado';
  end if;

  mi_saldo := public.saldo(yo);
  if mi_saldo < c.price_coins then
    raise exception 'Te faltan % coins', c.price_coins - mi_saldo;
  end if;

  -- 20% de comision, el mismo numero que promete la pagina de creadoras.
  comision  := round(c.price_coins * 0.20);
  para_ella := c.price_coins - comision;

  insert into public.purchases (user_id, clip_id, price_coins)
  values (yo, clip, c.price_coins);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -c.price_coins, 'compra_clip', clip, yo, c.title),
         (c.creator_id, para_ella, 'venta_clip', clip, yo, c.title);

  return jsonb_build_object(
    'ok', true,
    'saldo', public.saldo(yo),
    'pagaste', c.price_coins,
    'recibio', para_ella
  );
end;
$$;

-- ── Ajuste de saldo por administracion ──────────────────────────────────────
create or replace function public.admin_ajustar_saldo(
  objetivo uuid, cantidad int, motivo_texto text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede mover saldos'
      using errcode = 'insufficient_privilege';
  end if;
  if cantidad = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  if coalesce(trim(motivo_texto), '') = '' then
    -- Un ajuste sin explicacion es justo lo que el libro contable existe para
    -- evitar: dentro de un mes nadie recordara por que aparecio ese numero.
    raise exception 'Todo ajuste necesita un motivo escrito';
  end if;

  insert into public.coin_ledger (user_id, delta, motivo, nota, creado_por)
  values (objetivo, cantidad, 'ajuste_admin', motivo_texto, auth.uid());

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'ajustar_saldo', objetivo,
          jsonb_build_object('cantidad', cantidad, 'motivo', motivo_texto));

  return jsonb_build_object('ok', true, 'saldo', public.saldo(objetivo));
end;
$$;

-- ── El paywall en la capa de almacenamiento ─────────────────────────────────
-- Aqui es donde la compra se vuelve acceso real al archivo. Sin esto, comprar
-- solo pintaria un boton distinto.
drop policy if exists clips_archivo_leer_propio on storage.objects;

create policy clips_archivo_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'clips'
    and (
      (storage.foldername(name))[1] = auth.uid()::text   -- su autora
      or public.es_admin()
      or exists (                                        -- quien pago
        select 1 from public.purchases p
        join public.clips c on c.id = p.clip_id
        where p.user_id = auth.uid() and c.storage_path = storage.objects.name
      )
      or exists (                                        -- o si es gratis
        select 1 from public.clips c
        where c.storage_path = storage.objects.name
          and c.published and c.visibility = 'gratis'
      )
    )
  );

revoke all on function public.comprar_clip(uuid) from public, anon;
revoke all on function public.admin_ajustar_saldo(uuid, int, text) from public, anon;
grant execute on function public.comprar_clip(uuid) to authenticated;
grant execute on function public.admin_ajustar_saldo(uuid, int, text) to authenticated;
grant execute on function public.saldo(uuid) to authenticated;
