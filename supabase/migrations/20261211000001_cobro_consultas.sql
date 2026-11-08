-- Cobro de las consultas por Telegram y devolucion si no hay respuesta.
--
-- DECISION DE SERGIO (7 nov 2026): si la creadora no responde un mensaje pagado en
-- 2 dias, se le devuelve el saldo al cliente. El plazo (2 dias) y el precio (20
-- pesos por mensaje del cliente) no cambian.
--
-- COMO SE MUEVE EL DINERO (todo en centavos de dolar, como el resto del libro)
--   1. Al registrarse el mensaje del cliente (`bot_registrar_cliente`) se le cobra
--      de su saldo DISPONIBLE el equivalente de 20 pesos, con el tipo de cambio
--      vigente. Ese monto exacto queda en `consulta_mensajes.cobro_coins`.
--      Sin saldo suficiente NO se registra ni se envia, y no se descuenta nada.
--   2. El cobro queda RETENIDO: se le quita al cliente y no se le acredita a nadie
--      (el mismo patron que los encargos pagados: el dinero queda con la
--      plataforma hasta que se cumple o se devuelve).
--   3. Si la creadora responde a tiempo (`bot_registrar_creadora`): se reparte
--      como siempre, con `comision_de()` (la misma funcion que las ventas): la
--      plataforma se queda la comision y a la creadora se le abona el resto
--      ('venta_consulta'). El cliente no recibe nada de vuelta.
--   4. Si vence sin respuesta (`consultas_vencer`): el mensaje pasa de 'enviado' a
--      'vencido' y se devuelve al cliente el 100% de `cobro_coins` ('reembolso'),
--      UNA sola vez: solo se devuelven las filas que cambian de estado en esa
--      misma sentencia. A la creadora no se le descuenta nada: nunca se le
--      acredito.
--   5. Si Telegram no entrego el mensaje (`bot_anular_mensaje`) se devuelve el
--      cobro y se borra el mensaje.
--   Cada movimiento lleva `ref_id` = el mensaje, para poder auditarlo. Los
--   mensajes anteriores a esta migracion (`cobro_coins = 0`) no generan cargo ni
--   devolucion retroactivos.
--
-- EL PRECIO EN PESOS vive en `consultas_config.precio_mxn_centavos` (2000 = 20.00
-- MXN) y se convierte a centavos de dolar con `tipo_cambio_usd_mxn` (centavos de
-- peso por dolar; 1850 = 18.50 MXN por USD), igual que los retiros pero al reves:
--   centavos_de_dolar = round(centavos_de_peso * 100 / tipo_cambio)
--   2000 * 100 / 1850 = 108.1  ->  108 centavos de dolar (1.08 USD).
-- Si cambia el tipo de cambio despues, lo ya cobrado no se toca: la devolucion
-- usa el monto guardado, no una conversion nueva.
--
-- CREADORA SIN IDENTIDAD VERIFICADA. Un disparador del libro ya impide acreditar
-- 'venta_clip' o 'propina' a quien no la tiene; ahora tambien 'venta_consulta'. Con
-- el cobro encendido, a una creadora asi NO se le cobra al cliente: se le avisa que
-- no puede recibir mensajes pagados todavia.
--
-- SE ENCIENDE AL FINAL (`cobro_activo = true`). Para que no haya un hueco, el orden
-- de salida es: desplegar la funcion `telegram-bot` (tolera las dos versiones),
-- aplicar esta migracion y subir la web (`COBRO_CONSULTAS_ACTIVO`).

-- ---------- Configuracion y precio ----------

alter table public.consultas_config
  add column if not exists precio_mxn_centavos int not null default 2000
  check (precio_mxn_centavos > 0);

comment on column public.consultas_config.precio_mxn_centavos is
  'Precio de cada mensaje del cliente, en CENTAVOS DE PESO. 2000 = 20.00 MXN. Se convierte a centavos de dolar con tipo_cambio_usd_mxn al cobrar.';

-- Centavos de dolar que cuesta hoy un mensaje, o nulo si no hay tipo de cambio.
create or replace function public.consulta_precio_coins()
returns int language plpgsql stable security definer set search_path = '' as $$
declare cambio int := public.tipo_cambio_usd_mxn(); mxn int;
begin
  select c.precio_mxn_centavos into mxn from public.consultas_config c;
  if cambio is null or cambio <= 0 or mxn is null then return null; end if;
  return greatest(1, round(mxn::numeric * 100 / cambio)::int);
end; $$;
revoke all on function public.consulta_precio_coins() from public, anon, authenticated;

-- ---------- El libro: gastar en consultas respeta lo reservado; cobrar exige identidad ----------

create or replace function public.ledger_no_deja_saldo_negativo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actual bigint; reservado bigint := 0;
begin
  if new.delta >= 0 or new.motivo not in ('compra_clip', 'propina', 'retiro', 'consulta') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('saldo:' || new.user_id::text, 0));
  select coalesce(sum(delta), 0) into actual
    from public.coin_ledger where user_id = new.user_id;
  if new.motivo <> 'retiro' then
    select coalesce(sum(coins), 0) into reservado
      from public.solicitudes_retiro
     where creator_id = new.user_id and estado = 'pendiente';
  end if;
  if actual + new.delta < reservado then
    raise exception 'El saldo ya no alcanza para este movimiento';
  end if;
  return new;
end; $$;

create or replace function public.propina_exige_verificacion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.delta > 0 and new.motivo in ('venta_clip', 'propina', 'venta_consulta')
     and not public.puede_cobrar(new.user_id) then
    raise exception 'Esa creadora todavia no tiene la identidad verificada, asi que no puede recibir pagos'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

-- ---------- Cobrar al registrar el mensaje del cliente ----------

create or replace function public.bot_registrar_cliente(p_consulta uuid, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg record; q record; limpio text; n int; nuevo uuid; recientes int;
  precio int := 0; titulo text;
begin
  select * into cfg from public.consultas_config;
  limpio := regexp_replace(coalesce(p_cuerpo, ''),
    '^[\s ​‌‍⁠﻿]+|[\s ​‌‍⁠﻿]+$', '', 'g');
  select * into q from public.consultas where id = p_consulta;
  if q is null then return jsonb_build_object('ok', false, 'motivo', 'consulta'); end if;
  if not public.cuenta_activa(q.cliente_id) or not public.cuenta_activa(q.creadora_id) then
    return jsonb_build_object('ok', false, 'motivo', 'cuenta');
  end if;
  n := coalesce(array_length(regexp_split_to_array(limpio, '[\s ]+'), 1), 0);
  if char_length(limpio) = 0 or n < cfg.min_palabras then
    return jsonb_build_object('ok', false, 'motivo', 'corto', 'palabras', n, 'minimo', cfg.min_palabras);
  end if;
  if char_length(limpio) > 4000 then
    return jsonb_build_object('ok', false, 'motivo', 'largo');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('consulta:' || q.cliente_id::text, 0));
  select count(*) into recientes from public.consulta_mensajes m
   where m.consulta_id = q.id and m.de = 'cliente' and m.created_at > now() - interval '1 minute';
  if recientes >= 3 then return jsonb_build_object('ok', false, 'motivo', 'rapido'); end if;

  -- El cobro. Se decide ANTES de registrar nada: sin saldo, no hay mensaje.
  if cfg.cobro_activo then
    if not public.puede_cobrar(q.creadora_id) then
      return jsonb_build_object('ok', false, 'motivo', 'creadora');
    end if;
    precio := public.consulta_precio_coins();
    if precio is null then
      return jsonb_build_object('ok', false, 'motivo', 'precio');
    end if;
    perform pg_advisory_xact_lock(hashtextextended('saldo:' || q.cliente_id::text, 0));
    if public.retiro_disponible(q.cliente_id) < precio then
      return jsonb_build_object('ok', false, 'motivo', 'saldo');
    end if;
  end if;

  insert into public.consulta_mensajes (consulta_id, de, cuerpo, palabras, vence_at, cobro_coins)
  values (q.id, 'cliente', limpio, n, now() + make_interval(hours => cfg.plazo_horas), precio)
  returning id into nuevo;

  if precio > 0 then
    select c.title into titulo from public.clips c where c.id = q.clip_id;
    insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
    values (q.cliente_id, -precio, 'consulta', nuevo, q.cliente_id,
            'Consulta por Telegram: ' || coalesce(titulo, ''));
  end if;

  update public.consultas set ultimo_at = now() where id = q.id;
  return jsonb_build_object('ok', true, 'mensaje', nuevo, 'palabras', n,
                            'cobrado', precio,
                            'precio_mxn_centavos', case when precio > 0 then cfg.precio_mxn_centavos end);
end; $$;

-- ---------- Repartir al responder a tiempo ----------

create or replace function public.bot_registrar_creadora(p_mensaje uuid, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m record; q record; limpio text; n int; comision int; para_ella int; titulo text;
begin
  limpio := regexp_replace(coalesce(p_cuerpo, ''),
    '^[\s ​‌‍⁠﻿]+|[\s ​‌‍⁠﻿]+$', '', 'g');
  select * into m from public.consulta_mensajes where id = p_mensaje for update;
  if not found or m.de <> 'cliente' or m.estado <> 'enviado' then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  -- Un mensaje COBRADO cuyo plazo ya paso no se paga aunque el bot aun no lo haya
  -- marcado como vencido: lo devuelve `consultas_vencer`. Si no, se pagaria a la
  -- creadora Y se devolveria al cliente.
  if m.cobro_coins > 0 and m.vence_at < now() then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  if char_length(limpio) = 0 or char_length(limpio) > 4000 then
    return jsonb_build_object('ok', false, 'motivo', 'largo');
  end if;
  n := coalesce(array_length(regexp_split_to_array(limpio, '[\s ]+'), 1), 0);

  insert into public.consulta_mensajes (consulta_id, de, cuerpo, palabras, estado, respondido_at)
  values (m.consulta_id, 'creadora', limpio, n, 'respondido', now());
  update public.consulta_mensajes set estado = 'respondido', respondido_at = now() where id = m.id;
  update public.consultas set ultimo_at = now() where id = m.consulta_id;

  -- Respondio a tiempo: se libera lo retenido, con el reparto de siempre.
  if m.cobro_coins > 0 then
    select * into q from public.consultas where id = m.consulta_id;
    select c.title into titulo from public.clips c where c.id = q.clip_id;
    comision  := public.comision_de(m.cobro_coins);
    para_ella := m.cobro_coins - comision;
    if para_ella > 0 then
      insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
      values (q.creadora_id, para_ella, 'venta_consulta', m.id, q.cliente_id,
              'Consulta por Telegram: ' || coalesce(titulo, ''));
    end if;
  end if;
  return jsonb_build_object('ok', true);
end; $$;

-- ---------- Si Telegram no entrego el mensaje, no se pierde el saldo ----------

create or replace function public.bot_anular_mensaje(p_mensaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m record; q record;
begin
  -- 'enviado' evita devolver dos veces si `consultas_vencer` ya lo devolvio.
  select * into m from public.consulta_mensajes
   where id = p_mensaje and de = 'cliente' and tg_msg_id is null and estado = 'enviado'
   for update;
  if not found then return; end if;
  if m.cobro_coins > 0 then
    select * into q from public.consultas where id = m.consulta_id;
    insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
    values (q.cliente_id, m.cobro_coins, 'reembolso', m.id, q.cliente_id,
            'Consulta por Telegram: mensaje no entregado');
  end if;
  delete from public.consulta_mensajes where id = m.id;
end; $$;

-- ---------- Vencer y devolver ----------
-- El tipo de retorno cambia (`devuelto_coins`), asi que se borra y se crea.

drop function if exists public.consultas_vencer();

create function public.consultas_vencer()
returns table (chat_cliente bigint, chat_creadora bigint, clip text, creadora text, devuelto_coins int)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with vencidos as (
    update public.consulta_mensajes m set estado = 'vencido'
     where m.de = 'cliente' and m.estado = 'enviado' and m.vence_at < now()
    returning m.id, m.consulta_id, m.cobro_coins
  ), devolucion as (
    -- Solo las filas que ACABAN de cambiar de estado: una sola vez por mensaje.
    insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
    select q.cliente_id, v.cobro_coins, 'reembolso', v.id, q.cliente_id,
           'Consulta por Telegram sin respuesta en el plazo'
      from vencidos v join public.consultas q on q.id = v.consulta_id
     where v.cobro_coins > 0
    returning ref_id
  )
  select tc.chat_id, tr.chat_id, c.title, pr.handle, v.cobro_coins
    from vencidos v
    join public.consultas q on q.id = v.consulta_id
    join public.clips c on c.id = q.clip_id
    join public.profiles pr on pr.id = q.creadora_id
    left join public.telegram_cuentas tc on tc.user_id = q.cliente_id
    left join public.telegram_cuentas tr on tr.user_id = q.creadora_id;
end; $$;

revoke all on function public.consultas_vencer() from public, anon, authenticated;
grant execute on function public.consultas_vencer() to service_role;

-- ---------- Encender el cobro ----------

update public.consultas_config set cobro_activo = true;
