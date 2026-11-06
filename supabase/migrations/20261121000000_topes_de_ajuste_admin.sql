-- Topes y segunda firma para ajustes y reembolsos de administracion.
--
-- `admin_ajustar_saldo` y `admin_reembolsar` movian cualquier cantidad con una
-- sola persona y un motivo escrito. Son coins que despues pueden salir como un
-- SPEI real, asi que ahora hay un limite por movimiento y uno por dia, y lo que
-- pasa del limite no se aplica: queda propuesto y lo aprueba OTRA administradora.
--
-- - tope por movimiento: ajuste_admin_tope_coins         (centavos de dolar)
-- - tope por dia y por administradora: ajuste_admin_tope_diario_coins
--   Valores iniciales: $200.00 y $1,000.00. Son una decision de negocio y se
--   cambian con admin_ajustar_bandera_num; el cambio queda en la bitacora.
-- - Con UNA sola administradora no hay quien firme: ella misma puede aprobar su
--   propuesta pasadas 24 horas. Es enfriamiento, no segunda firma; en cuanto
--   haya otra administradora, la firma es de la otra.

insert into public.ajustes (clave, valor) values
  ('ajuste_admin_tope_coins',         to_jsonb(20000)),
  ('ajuste_admin_tope_diario_coins', to_jsonb(100000))
on conflict (clave) do nothing;

create table public.ajustes_pendientes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('ajuste', 'reembolso')),
  cantidad      integer not null check (cantidad <> 0),
  objetivo      uuid not null references public.profiles (id),
  detalle       jsonb not null default '{}',   -- reembolso: de_quien, referencia
  motivo        text not null,
  propuesto_por uuid not null references public.profiles (id),
  propuesto_at  timestamptz not null default now(),
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  resuelto_por  uuid references public.profiles (id),
  resuelto_at   timestamptz,
  nota          text
);
alter table public.ajustes_pendientes enable row level security;
revoke all on public.ajustes_pendientes from anon, authenticated;

-- ---------- Piezas internas (solo las llaman las funciones de abajo) ----------

create or replace function public.ajuste_pasa_del_tope(p_cantidad integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select abs(p_cantidad) > coalesce((select (valor)::text::int from public.ajustes
                                      where clave = 'ajuste_admin_tope_coins'), 20000)
      or abs(p_cantidad) + coalesce((
           select sum(case when l.motivo = 'ajuste_admin' then abs(l.delta)
                           when l.motivo = 'reembolso' and l.delta > 0 then l.delta
                           else 0 end)
             from public.coin_ledger l
            where l.creado_por = auth.uid() and l.motivo in ('ajuste_admin', 'reembolso')
              and l.created_at > now() - interval '24 hours'), 0)
         > coalesce((select (valor)::text::int from public.ajustes
                      where clave = 'ajuste_admin_tope_diario_coins'), 100000);
$$;
revoke all on function public.ajuste_pasa_del_tope(integer) from public, anon, authenticated;

create or replace function public.aplicar_ajuste(
  p_objetivo uuid, p_cantidad integer, p_motivo text, p_propuso uuid, p_aprobo uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.coin_ledger (user_id, delta, motivo, nota, creado_por)
  values (p_objetivo, p_cantidad, 'ajuste_admin', p_motivo, p_propuso);
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (coalesce(p_aprobo, p_propuso), 'ajustar_saldo', p_objetivo,
          jsonb_build_object('cantidad', p_cantidad, 'motivo', p_motivo,
                             'propuesto_por', p_propuso, 'aprobado_por', p_aprobo));
end; $$;
revoke all on function public.aplicar_ajuste(uuid, integer, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.aplicar_reembolso(
  p_destino uuid, p_de_quien uuid, p_cantidad integer, p_motivo text, p_referencia uuid,
  p_propuso uuid, p_aprobo uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Dos asientos, no uno: el dinero sale de alguien y entra a alguien. Se
  -- permite que la creadora quede en negativo: si ya se gasto lo que hay que
  -- devolver, esconderlo no lo arregla.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (p_de_quien, -p_cantidad, 'reembolso', p_referencia, p_propuso, p_motivo),
         (p_destino,   p_cantidad, 'reembolso', p_referencia, p_propuso, p_motivo);
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (coalesce(p_aprobo, p_propuso), 'reembolsar', p_destino,
          jsonb_build_object('de', p_de_quien, 'para', p_destino, 'coins', p_cantidad,
                             'motivo', p_motivo, 'ref', p_referencia,
                             'saldo_resultante_origen', public.saldo(p_de_quien),
                             'propuesto_por', p_propuso, 'aprobado_por', p_aprobo));
end; $$;
revoke all on function public.aplicar_reembolso(uuid, uuid, integer, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ---------- Ajustar saldo ----------

create or replace function public.admin_ajustar_saldo(objetivo uuid, cantidad integer, motivo_texto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare nuevo uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede mover saldos'
      using errcode = 'insufficient_privilege';
  end if;
  if cantidad = 0 then raise exception 'La cantidad no puede ser cero'; end if;
  if coalesce(trim(motivo_texto), '') = '' then
    raise exception 'Todo ajuste necesita un motivo escrito';
  end if;
  if not exists (select 1 from public.profiles p where p.id = objetivo) then
    raise exception 'Ese usuario no existe';
  end if;

  if public.ajuste_pasa_del_tope(cantidad) then
    insert into public.ajustes_pendientes (tipo, cantidad, objetivo, motivo, propuesto_por)
    values ('ajuste', cantidad, objetivo, motivo_texto, auth.uid())
    returning id into nuevo;
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'proponer_ajuste', objetivo,
            jsonb_build_object('pendiente', nuevo, 'cantidad', cantidad, 'motivo', motivo_texto));
    return jsonb_build_object('ok', true, 'pendiente', true, 'id', nuevo);
  end if;

  perform public.aplicar_ajuste(objetivo, cantidad, motivo_texto, auth.uid(), null);
  return jsonb_build_object('ok', true, 'saldo', public.saldo(objetivo));
end; $$;

-- ---------- Reembolsar ----------

create or replace function public.admin_reembolsar(
  destino uuid, de_quien uuid, cantidad integer, motivo text, referencia uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare nuevo uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede reembolsar'
      using errcode = 'insufficient_privilege';
  end if;
  if cantidad <= 0 then raise exception 'La cantidad debe ser positiva'; end if;
  if coalesce(trim(motivo), '') = '' then
    raise exception 'Un reembolso necesita motivo escrito';
  end if;
  if destino = de_quien then raise exception 'El reembolso tiene que ser entre dos cuentas distintas'; end if;
  if not exists (select 1 from public.profiles p where p.id = destino)
  or not exists (select 1 from public.profiles p where p.id = de_quien) then
    raise exception 'Alguna de las cuentas no existe';
  end if;

  if public.ajuste_pasa_del_tope(cantidad) then
    insert into public.ajustes_pendientes (tipo, cantidad, objetivo, detalle, motivo, propuesto_por)
    values ('reembolso', cantidad, destino,
            jsonb_build_object('de_quien', de_quien, 'referencia', referencia), motivo, auth.uid())
    returning id into nuevo;
    insert into public.admin_log (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'proponer_ajuste', destino,
            jsonb_build_object('pendiente', nuevo, 'tipo', 'reembolso', 'cantidad', cantidad,
                               'de', de_quien, 'motivo', motivo));
    return jsonb_build_object('ok', true, 'pendiente', true, 'id', nuevo);
  end if;

  perform public.aplicar_reembolso(destino, de_quien, cantidad, motivo, referencia, auth.uid(), null);
  return jsonb_build_object('ok', true, 'saldo_origen', public.saldo(de_quien));
end; $$;

-- ---------- Aprobar, rechazar y listar ----------

create or replace function public.admin_aprobar_ajuste(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ajustes_pendientes; yo uuid := auth.uid();
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede aprobar' using errcode = 'insufficient_privilege';
  end if;
  select * into a from public.ajustes_pendientes where id = p_id for update;
  if a.id is null then raise exception 'Esa propuesta no existe'; end if;
  if a.estado <> 'pendiente' then raise exception 'Esa propuesta ya estaba %', a.estado; end if;

  if a.propuesto_por = yo then
    if (select count(*) from public.admins) > 1 then
      raise exception 'Otra administradora tiene que aprobar esta propuesta';
    end if;
    if a.propuesto_at > now() - interval '24 hours' then
      raise exception 'Con una sola administradora la propuesta espera 24 horas: se podra aprobar el %',
        to_char(a.propuesto_at + interval '24 hours', 'DD/MM HH24:MI');
    end if;
  end if;

  if a.tipo = 'ajuste' then
    perform public.aplicar_ajuste(a.objetivo, a.cantidad, a.motivo, a.propuesto_por, yo);
  else
    perform public.aplicar_reembolso(a.objetivo, (a.detalle ->> 'de_quien')::uuid, a.cantidad, a.motivo,
                                     nullif(a.detalle ->> 'referencia', '')::uuid, a.propuesto_por, yo);
  end if;

  update public.ajustes_pendientes
     set estado = 'aprobado', resuelto_por = yo, resuelto_at = now() where id = a.id;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_aprobar_ajuste(uuid) from public, anon;
grant execute on function public.admin_aprobar_ajuste(uuid) to authenticated;

create or replace function public.admin_rechazar_ajuste(p_id uuid, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare filas int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede rechazar' using errcode = 'insufficient_privilege';
  end if;
  update public.ajustes_pendientes
     set estado = 'rechazado', resuelto_por = auth.uid(), resuelto_at = now(), nota = p_nota
   where id = p_id and estado = 'pendiente';
  get diagnostics filas = row_count;
  if filas = 0 then raise exception 'Esa propuesta no existe o ya estaba resuelta'; end if;
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'rechazar_ajuste', auth.uid(), jsonb_build_object('pendiente', p_id, 'nota', p_nota));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_rechazar_ajuste(uuid, text) from public, anon;
grant execute on function public.admin_rechazar_ajuste(uuid, text) to authenticated;

create or replace function public.admin_ajustes_pendientes()
returns table (
  id uuid, tipo text, cantidad integer, objetivo uuid, objetivo_handle text,
  de_quien_handle text, motivo text, propuesto_handle text, propuesto_at timestamptz,
  puede_aprobar boolean
) language sql stable security definer set search_path = '' as $$
  select a.id, a.tipo, a.cantidad, a.objetivo, po.handle,
         pd.handle, a.motivo, pp.handle, a.propuesto_at,
         (a.propuesto_por <> auth.uid()
          or ((select count(*) from public.admins) = 1 and a.propuesto_at <= now() - interval '24 hours'))
    from public.ajustes_pendientes a
    join public.profiles po on po.id = a.objetivo
    join public.profiles pp on pp.id = a.propuesto_por
    left join public.profiles pd on pd.id = nullif(a.detalle ->> 'de_quien', '')::uuid
   where public.es_admin() and a.estado = 'pendiente'
   order by a.propuesto_at;
$$;
revoke all on function public.admin_ajustes_pendientes() from public, anon;
grant execute on function public.admin_ajustes_pendientes() to authenticated;
