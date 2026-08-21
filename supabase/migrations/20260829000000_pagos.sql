-- Pagos y dispersion.
--
-- Diseño agnostico al proveedor a proposito. Conekta y casi todos los
-- procesadores mexicanos prohiben contenido para adultos en sus terminos, asi
-- que hay una probabilidad real de tener que migrar a un procesador de alto
-- riesgo. Amarrar el esquema a Conekta seria comprarse esa reescritura.

create type public.proveedor_pago as enum ('conekta_oxxo', 'conekta_spei', 'ccbill', 'manual');
create type public.estado_pago     as enum ('pendiente', 'pagado', 'vencido', 'cancelado', 'reembolsado');
create type public.concepto_pago   as enum ('recarga_coins', 'compra_clip', 'renta_clip', 'suscripcion', 'encargo');

create table public.payment_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,

  proveedor     public.proveedor_pago not null,
  -- id de la orden en el proveedor. Unico para que un webhook repetido no
  -- pueda crear dos ordenes: los proveedores reintentan, y sin esto un
  -- reintento acreditaria el pago dos veces.
  proveedor_ref text,

  concepto      public.concepto_pago not null,
  objetivo_id   uuid,                  -- clip, tier o encargo, segun concepto
  coins         int  check (coins is null or coins > 0),   -- si es recarga

  monto_mxn     int  not null check (monto_mxn > 0),       -- centavos
  estado        public.estado_pago not null default 'pendiente',

  -- OXXO da una referencia impresa con vencimiento. Tres dias es lo pedido.
  referencia    text,
  vence_at      timestamptz,
  pagado_at     timestamptz,

  -- Cuerpo crudo del webhook. Se guarda para poder auditar una discrepancia
  -- contra el proveedor sin depender de que su panel siga mostrandola.
  crudo         jsonb not null default '{}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (proveedor, proveedor_ref)
);

create index ordenes_usuario_idx  on public.payment_orders (user_id, created_at desc);
create index ordenes_pendientes_idx on public.payment_orders (estado, vence_at)
  where estado = 'pendiente';

alter table public.payment_orders enable row level security;

create policy ordenes_select_propio on public.payment_orders for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Sin insert ni update desde el cliente. Las ordenes las crea el servicio de
-- pagos y solo el webhook las marca pagadas: si el navegador pudiera escribir
-- 'pagado', el paywall completo seria decorativo.

-- ── Datos fiscales y bancarios de la creadora ───────────────────────────────
create type public.regimen_fiscal as enum ('persona_fisica', 'rif', 'moral', 'sin_registro');

create table public.payout_accounts (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  titular       text not null,
  clabe         text not null check (clabe ~ '^[0-9]{18}$'),
  banco         text,
  rfc           text check (rfc is null or rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  regimen       public.regimen_fiscal not null default 'sin_registro',
  verificado    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

-- Datos bancarios: solo su dueña. Un admin NO los lee desde aqui a proposito;
-- para dispersar se usa la vista de abajo, que expone lo minimo.
create policy payout_propio on public.payout_accounts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Retenciones ─────────────────────────────────────────────────────────────
-- Las tasas van en tabla y no en el codigo porque cambian por reforma fiscal y
-- por regimen. Al quedar fechadas, un pago viejo conserva la tasa que le
-- aplicaba y no se recalcula con la de hoy.
create table public.tasas_retencion (
  id              bigserial primary key,
  vigente_desde   date not null,
  regimen         public.regimen_fiscal not null,
  isr_pct         numeric(5,2) not null check (isr_pct >= 0 and isr_pct <= 100),
  iva_ret_pct     numeric(5,2) not null check (iva_ret_pct >= 0 and iva_ret_pct <= 100),
  nota            text,
  unique (vigente_desde, regimen)
);

comment on table public.tasas_retencion is
  'Tasas de retencion por regimen. LOS VALORES SEMBRADOS SON UN MARCADOR DE POSICION: deben confirmarse con un contador antes de dispersar dinero real. La ley de plataformas digitales del SAT ha cambiado sus tasas varias veces.';

alter table public.tasas_retencion enable row level security;
create policy tasas_lectura on public.tasas_retencion for select to authenticated using (true);

-- ── Dispersiones ────────────────────────────────────────────────────────────
create type public.estado_dispersion as enum ('calculada', 'programada', 'enviada', 'pagada', 'rechazada');

create table public.payouts (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.profiles (id) on delete cascade,

  periodo_ini   date not null,
  periodo_fin   date not null,

  bruto_mxn     int not null check (bruto_mxn >= 0),   -- centavos
  isr_mxn       int not null default 0 check (isr_mxn >= 0),
  iva_ret_mxn   int not null default 0 check (iva_ret_mxn >= 0),
  neto_mxn      int not null check (neto_mxn >= 0),

  -- Se congela la tasa usada. Sin esto, recalcular un pago del año pasado con
  -- la tasa de hoy daria un numero distinto al que realmente se deposito.
  isr_pct_aplicado     numeric(5,2),
  iva_ret_pct_aplicado numeric(5,2),

  estado        public.estado_dispersion not null default 'calculada',
  spei_ref      text,
  enviada_at    timestamptz,
  created_at    timestamptz not null default now(),

  check (neto_mxn = bruto_mxn - isr_mxn - iva_ret_mxn)
);

create index payouts_creadora_idx on public.payouts (creator_id, periodo_fin desc);

alter table public.payouts enable row level security;

create policy payouts_select on public.payouts for select to authenticated
  using (creator_id = auth.uid() or public.es_admin());
create policy payouts_admin on public.payouts for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Valores iniciales, explicitamente marcados como provisionales.
insert into public.tasas_retencion (vigente_desde, regimen, isr_pct, iva_ret_pct, nota) values
  ('2026-01-01', 'persona_fisica', 2.10, 50.00, 'PROVISIONAL — confirmar con contador'),
  ('2026-01-01', 'sin_registro',  20.00, 100.00, 'PROVISIONAL — sin RFC la retencion es mayor; confirmar'),
  ('2026-01-01', 'rif',            2.10, 50.00, 'PROVISIONAL — confirmar con contador'),
  ('2026-01-01', 'moral',          0.00,  0.00, 'PROVISIONAL — la moral factura y retiene por su cuenta');
