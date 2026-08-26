-- Arregla la guardia de "ya estas suscrita".
--
-- EL FALLO: se comprobaba `if existente is not null`. Sobre un RECORD eso NO
-- significa "se encontro una fila": Postgres lo evalua como "TODOS los campos
-- son no nulos". La fila hallada traia proveedor_ref nulo, asi que la
-- condicion daba falso y la guardia no se activaba nunca.
--
-- Consecuencia: quien ya estaba suscrita podia volver a suscribirse y pagar
-- otra vez el mismo mes. Cobrar dos veces por lo mismo.
--
-- Se usa el campo id, que nunca es nulo cuando hay fila. FOUND tambien
-- serviria, pero el id deja dicho por que.

create or replace function public.suscribirse(nivel uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); t record; mi_saldo bigint; comision int; para_ella int;
        fin timestamptz; hasta timestamptz;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  select * into t from public.subscription_tiers where id = nivel and activo;
  if t is null then raise exception 'Ese nivel no existe o ya no esta activo'; end if;
  if t.creator_id = yo then raise exception 'No puedes suscribirte a ti misma'; end if;
  if coalesce(t.precio_coins, 0) <= 0 then
    raise exception 'Ese nivel todavia no tiene precio en coins';
  end if;

  -- Un valor escalar, no un record: aqui no hay ambiguedad posible.
  select s.periodo_fin into hasta from public.subscriptions s
   where s.creator_id = t.creator_id and s.subscriber_id = yo
     and s.estado = 'activa' and s.periodo_fin > now();
  if hasta is not null then
    raise exception 'Ya estas suscrita hasta el %', to_char(hasta, 'DD/MM/YYYY');
  end if;

  mi_saldo := public.saldo(yo);
  if mi_saldo < t.precio_coins then
    raise exception 'Te faltan % coins', t.precio_coins - mi_saldo;
  end if;

  comision  := public.comision_de(t.precio_coins);
  para_ella := t.precio_coins - comision;
  fin := now() + interval '30 days';

  insert into public.subscriptions
    (subscriber_id, creator_id, tier_id, estado, inicio, periodo_fin, proveedor)
  values (yo, t.creator_id, nivel, 'activa', now(), fin, 'coins')
  on conflict (subscriber_id, creator_id) do update
    set tier_id = excluded.tier_id, estado = 'activa',
        inicio = excluded.inicio, periodo_fin = excluded.periodo_fin,
        cancela_al_fin = false, updated_at = now();

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -t.precio_coins, 'compra_clip', nivel, yo, 'Suscripcion: ' || t.nombre),
         (t.creator_id, para_ella, 'venta_clip', nivel, yo, 'Suscripcion: ' || t.nombre);

  return jsonb_build_object('ok', true, 'hasta', fin);
end; $$;
revoke all on function public.suscribirse(uuid) from public, anon;
grant execute on function public.suscribirse(uuid) to authenticated;
