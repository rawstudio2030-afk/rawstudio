-- Modulo 8: retiros y reembolsos.
--
-- EL PROBLEMA DE LAS DOS MONEDAS, otra vez. La creadora tiene coins; el SPEI
-- se manda en pesos. Convertir exige un tipo de cambio que nadie ha definido
-- porque no hay procesador de pagos.
--
-- No se inventa uno. Se guarda en public.ajustes, arranca SIN VALOR, y la
-- aprobacion de un retiro se niega mientras no este puesto. Asi el flujo
-- existe entero y lo unico que falta es un numero que tiene que decidir una
-- persona, no yo.

insert into public.ajustes (clave, valor, nota) values
  ('valor_coin_mxn', 'null'::jsonb,
   'Cuantos CENTAVOS de peso vale un coin. Sin esto no se puede aprobar ningun retiro: no hay forma de saber cuanto dinero real corresponde. Lo define quien administra cuando exista el procesador de pagos.'),
  ('retiro_minimo_coins', '500'::jsonb,
   'Minimo para solicitar un retiro. Existe porque cada SPEI cuesta comision fija y dispersar cantidades minusculas se come el pago.')
on conflict (clave) do nothing;

create or replace function public.valor_coin_mxn()
returns int language sql stable security definer set search_path = '' as $$
  select nullif((select valor from public.ajustes where clave='valor_coin_mxn'), 'null'::jsonb)::text::int;
$$;

-- ---------- Solicitudes ----------

do $$ begin
  create type public.estado_retiro as enum ('pendiente','aprobada','pagada','rechazada');
exception when duplicate_object then null; end $$;

create table if not exists public.solicitudes_retiro (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  coins       int  not null check (coins > 0),
  estado      public.estado_retiro not null default 'pendiente',
  -- Copia de los datos bancarios EN EL MOMENTO de solicitar. Si la creadora
  -- cambia su CLABE despues, hay que poder saber a donde se mando el dinero.
  clabe       text,
  banco       text,
  titular     text,
  rfc         text,
  regimen     public.regimen_fiscal,
  payout_id   uuid references public.payouts (id),
  motivo_rechazo text,
  resuelta_por uuid references public.profiles (id),
  resuelta_at  timestamptz,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index if not exists retiros_estado_idx on public.solicitudes_retiro (estado, created_at);
alter table public.solicitudes_retiro enable row level security;

create policy retiros_leer on public.solicitudes_retiro for select to authenticated
  using (creator_id = auth.uid() or public.es_admin());

-- ---------- Pedir un retiro ----------

create or replace function public.solicitar_retiro(cantidad int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); cta record; minimo int; disponible bigint; nueva uuid;
begin
  if yo is null then
    raise exception 'Hay que entrar' using errcode = 'insufficient_privilege';
  end if;
  if not public.puede_cobrar(yo) then
    raise exception 'Necesitas verificar tu identidad antes de poder retirar';
  end if;

  minimo := coalesce((select (valor)::text::int from public.ajustes
                       where clave='retiro_minimo_coins'), 500);
  if cantidad < minimo then
    raise exception 'El minimo para retirar son % coins', minimo;
  end if;

  -- Lo ya solicitado y sin resolver cuenta como comprometido: si no, se
  -- podria pedir tres veces el mismo saldo y aprobar las tres.
  disponible := public.saldo(yo) - coalesce((
    select sum(s.coins) from public.solicitudes_retiro s
     where s.creator_id = yo and s.estado in ('pendiente','aprobada')), 0);
  if cantidad > disponible then
    raise exception 'Solo tienes % coins disponibles (el resto ya esta en otra solicitud)', disponible;
  end if;

  select * into cta from public.payout_accounts where user_id = yo;
  if cta is null then
    raise exception 'Primero registra tu cuenta para recibir el pago';
  end if;

  insert into public.solicitudes_retiro
    (creator_id, coins, clabe, banco, titular, rfc, regimen, ip)
  values (yo, cantidad, cta.clabe, cta.banco, cta.titular, cta.rfc, cta.regimen,
          public.ip_solicitante())
  returning id into nueva;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (yo, 'solicitar_retiro', yo,
          jsonb_build_object('solicitud', nueva, 'coins', cantidad));
  return jsonb_build_object('ok', true, 'solicitud', nueva);
end; $$;
revoke all on function public.solicitar_retiro(int) from public, anon;
grant execute on function public.solicitar_retiro(int) to authenticated;

-- ---------- Resolver ----------

create or replace function public.admin_resolver_retiro(
  solicitud uuid, aprobar boolean, motivo text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; centavos int; bruto int; t record; isr int; iva int; neto int; disp uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver retiros'
      using errcode = 'insufficient_privilege';
  end if;
  select * into s from public.solicitudes_retiro where id = solicitud;
  if s is null then raise exception 'Esa solicitud no existe'; end if;
  if s.estado <> 'pendiente' then
    raise exception 'Esa solicitud ya estaba %', s.estado;
  end if;

  if not aprobar then
    if coalesce(trim(motivo),'') = '' then
      raise exception 'Rechazar un retiro necesita motivo: se le comunica a la creadora';
    end if;
    update public.solicitudes_retiro
       set estado = 'rechazada', motivo_rechazo = motivo,
           resuelta_por = auth.uid(), resuelta_at = now()
     where id = solicitud;
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'rechazar_retiro', s.creator_id,
            jsonb_build_object('solicitud', solicitud, 'motivo', motivo));
    return jsonb_build_object('ok', true, 'estado', 'rechazada');
  end if;

  centavos := public.valor_coin_mxn();
  if centavos is null then
    -- Se niega en vez de suponer. Un tipo de cambio inventado se convierte en
    -- una transferencia real por la cantidad equivocada.
    raise exception 'Falta definir cuanto vale un coin en pesos (ajuste valor_coin_mxn) antes de aprobar retiros';
  end if;

  bruto := s.coins * centavos;

  -- Retenciones vigentes segun el regimen declarado. Si no hay tasa para su
  -- regimen se toma cero y queda dicho en el detalle: mejor pagar de mas al
  -- SAT por error que retener a ojo.
  select * into t from public.tasas_retencion
   where regimen = coalesce(s.regimen, 'sin_registro') and vigente_desde <= current_date
   order by vigente_desde desc limit 1;

  isr := round(bruto * coalesce(t.isr_pct, 0) / 100.0);
  iva := round(bruto * coalesce(t.iva_ret_pct, 0) / 100.0);
  neto := bruto - isr - iva;

  insert into public.payouts (creator_id, periodo_ini, periodo_fin, bruto_mxn,
                              isr_mxn, iva_ret_mxn, neto_mxn,
                              isr_pct_aplicado, iva_ret_pct_aplicado, estado)
  values (s.creator_id, s.created_at::date, current_date, bruto,
          isr, iva, neto, coalesce(t.isr_pct,0), coalesce(t.iva_ret_pct,0), 'programada')
  returning id into disp;

  -- El cargo va DESPUES de crear la dispersion: si algo fallara antes, no
  -- quedaria saldo descontado sin ningun pago que lo explique.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (s.creator_id, -s.coins, 'ajuste_admin', solicitud, auth.uid(),
          'Retiro aprobado');

  update public.solicitudes_retiro
     set estado = 'aprobada', payout_id = disp,
         resuelta_por = auth.uid(), resuelta_at = now()
   where id = solicitud;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'aprobar_retiro', s.creator_id,
          jsonb_build_object('solicitud', solicitud, 'coins', s.coins,
                             'bruto_mxn', bruto, 'isr_mxn', isr,
                             'iva_ret_mxn', iva, 'neto_mxn', neto));

  return jsonb_build_object('ok', true, 'estado', 'aprobada', 'payout', disp,
                            'bruto_mxn', bruto, 'neto_mxn', neto);
end; $$;

create or replace function public.admin_marcar_pagado(solicitud uuid, referencia text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(referencia),'') = '' then
    raise exception 'Pon la referencia del SPEI: es la unica prueba de que se mando';
  end if;
  select * into s from public.solicitudes_retiro where id = solicitud;
  if s is null or s.estado <> 'aprobada' then
    raise exception 'Esa solicitud no esta aprobada';
  end if;

  update public.payouts set estado = 'pagada', spei_ref = referencia, enviada_at = now()
   where id = s.payout_id;
  update public.solicitudes_retiro set estado = 'pagada' where id = solicitud;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'pagar_retiro', s.creator_id,
          jsonb_build_object('solicitud', solicitud, 'spei_ref', referencia));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_retiros(
  filtro_estado text default 'pendiente', pagina int default 0, por_pagina int default 30
)
returns table (
  id uuid, creator_id uuid, handle text, nombre text, coins int, estado text,
  clabe text, banco text, titular text, rfc text, regimen text,
  motivo_rechazo text, created_at timestamptz, resuelta_at timestamptz,
  saldo_actual bigint, verificada boolean,
  bruto_mxn int, neto_mxn int, spei_ref text, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select s.id, s.creator_id, p.handle, p.display_name, s.coins, s.estado::text,
           s.clabe, s.banco, s.titular, s.rfc, s.regimen::text,
           s.motivo_rechazo, s.created_at, s.resuelta_at,
           public.saldo(s.creator_id)::bigint, p.identidad_verificada,
           d.bruto_mxn, d.neto_mxn, d.spei_ref
      from public.solicitudes_retiro s
      join public.profiles p on p.id = s.creator_id
      left join public.payouts d on d.id = s.payout_id
     where public.es_admin()
       and (filtro_estado = '' or s.estado::text = filtro_estado)
  )
  select b.*, count(*) over () from base b
   order by b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;

revoke all on function public.admin_resolver_retiro(uuid, boolean, text) from public, anon;
revoke all on function public.admin_marcar_pagado(uuid, text)           from public, anon;
revoke all on function public.admin_retiros(text, int, int)             from public, anon;
grant execute on function public.admin_resolver_retiro(uuid, boolean, text) to authenticated;
grant execute on function public.admin_marcar_pagado(uuid, text)           to authenticated;
grant execute on function public.admin_retiros(text, int, int)             to authenticated;

-- ---------- Reembolsos ----------

create or replace function public.admin_reembolsar(
  destino uuid, de_quien uuid, cantidad int, motivo text, referencia uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede reembolsar'
      using errcode = 'insufficient_privilege';
  end if;
  if cantidad <= 0 then raise exception 'La cantidad debe ser positiva'; end if;
  if coalesce(trim(motivo),'') = '' then
    raise exception 'Un reembolso necesita motivo escrito';
  end if;

  -- Dos asientos, no uno: el dinero sale de alguien y entra a alguien. Un
  -- reembolso que solo acredite crea coins de la nada y descuadra el libro.
  --
  -- Se permite que la creadora quede en negativo. Si ya se gasto lo que hay
  -- que devolver, esconderlo no lo arregla: dejarlo visible es lo unico que
  -- permite cobrarselo despues.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (de_quien, -cantidad, 'reembolso', referencia, auth.uid(), motivo),
         (destino,   cantidad, 'reembolso', referencia, auth.uid(), motivo);

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'reembolsar', destino,
          jsonb_build_object('de', de_quien, 'para', destino, 'coins', cantidad,
                             'motivo', motivo, 'ref', referencia,
                             'saldo_resultante_origen', public.saldo(de_quien)));
  return jsonb_build_object('ok', true, 'saldo_origen', public.saldo(de_quien));
end; $$;
revoke all on function public.admin_reembolsar(uuid, uuid, int, text, uuid) from public, anon;
grant execute on function public.admin_reembolsar(uuid, uuid, int, text, uuid) to authenticated;

-- Encargos pagados y no entregados: el caso concreto de la especificacion.
create or replace function public.admin_encargos_en_disputa()
returns table (id uuid, fan uuid, fan_handle text, creadora uuid, creadora_handle text,
               descripcion text, coins int, estado text, entrega_max timestamptz,
               created_at timestamptz, dias_de_retraso int)
language sql security definer stable set search_path = '' as $$
  select e.id, e.fan_id, pf.handle, e.creator_id, pc.handle,
         e.descripcion, coalesce(e.acordado_coins, e.oferta_coins),
         e.estado::text, e.entrega_max, e.created_at,
         greatest(0, extract(day from now() - e.entrega_max)::int)
    from public.custom_requests e
    join public.profiles pf on pf.id = e.fan_id
    join public.profiles pc on pc.id = e.creator_id
   where public.es_admin()
     and e.estado in ('pagado','en_proceso')
     and e.entrega_max is not null and e.entrega_max < now()
   order by e.entrega_max asc;
$$;
revoke all on function public.admin_encargos_en_disputa() from public, anon;
grant execute on function public.admin_encargos_en_disputa() to authenticated;
