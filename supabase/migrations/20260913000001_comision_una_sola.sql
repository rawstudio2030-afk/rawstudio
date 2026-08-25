-- Centraliza la comision.
--
-- Estaba escrita a mano como 0.20 en comprar_clip y en dar_propina, en dos
-- migraciones distintas. El dia que el reparto cambiara, una de las dos se
-- quedaria cobrando el porcentaje viejo sin que nadie lo notara: no falla,
-- no avisa, solo reparte mal. Ahora ambas llaman a public.comision_de().
--
-- El resto del cuerpo de cada funcion se copia SIN TOCAR desde la migracion
-- que la definio; lo unico que cambia es la linea del calculo.


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

  -- La comision sale de public.ajustes, no de un numero escrito aqui.
  comision := public.comision_de(c.price_coins);
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

  comision := public.comision_de(cantidad);
  neto     := cantidad - comision;

  insert into public.tips (de_id, para_id, coins, mensaje, contexto, ref_id)
  values (yo, para, cantidad, texto, ctx, referencia);

  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo,  -cantidad, 'propina', referencia, yo, texto),
         (para, neto,     'propina', referencia, yo, texto);

  return jsonb_build_object('ok', true, 'saldo', public.saldo(yo), 'recibio', neto);
end;
$$;
