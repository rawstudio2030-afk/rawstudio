-- Consultas pagadas por Telegram: el circuito (sin cobro todavia).
--
-- El puente entre quien consulta y la creadora es el bot, no un chat directo:
-- ninguna de las dos partes ve el telefono ni la cuenta de la otra. Aqui solo
-- vive lo que el bot necesita para enrutar; el `chat_id` de Telegram nunca sale
-- de la base hacia el navegador ni hacia la otra parte.
--
-- - Las tablas no tienen politicas para `anon` ni `authenticated`: todo pasa
--   por funcion. Las funciones `bot_*` son SOLO de `service_role` (la edge
--   function `telegram-bot`); el navegador no las alcanza.
-- - El codigo para vincular un Telegram es de un solo uso y caduca en 15
--   minutos. Se guarda solo su hash.
-- - EL COBRO NO ESTA AQUI. `coin_ledger` no tiene un motivo para esto, el
--   ledger solo deja gastar con ciertos motivos, y nadie ha definido el tipo de
--   cambio coins<->pesos (los 20 pesos del servicio). `cobro_coins` queda en
--   cero y `consultas_config.cobro_activo` en falso hasta que se decida. Cuando
--   se decida, se engancha en `bot_registrar_cliente` (cobro) y en
--   `consultas_vencer` (reembolso).
-- - Plazo de 2 dias para que la creadora responda: se aplica AL LEER (cada vez
--   que el bot recibe algo), no con tarea programada, como `caducidad`.

-- ---------- Tablas ----------

create table public.consultas_config (
  id           boolean primary key default true check (id),
  cobro_activo boolean not null default false,
  plazo_horas  int not null default 48 check (plazo_horas between 1 and 720),
  min_palabras int not null default 20 check (min_palabras between 1 and 200)
);
insert into public.consultas_config default values;

create table public.telegram_cuentas (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  chat_id         bigint not null unique,
  consulta_activa uuid,
  vinculada_at    timestamptz not null default now()
);

create table public.telegram_codigos (
  hash      text primary key,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  rol       text not null check (rol in ('cliente', 'creadora')),
  clip_id   uuid references public.clips (id) on delete cascade,
  expira_at timestamptz not null,
  usado_at  timestamptz,
  created_at timestamptz not null default now()
);
create index telegram_codigos_user_idx on public.telegram_codigos (user_id, created_at desc);

create table public.consultas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.profiles (id) on delete cascade,
  creadora_id uuid not null references public.profiles (id) on delete cascade,
  clip_id     uuid not null references public.clips (id) on delete cascade,
  created_at  timestamptz not null default now(),
  ultimo_at   timestamptz not null default now(),
  unique (cliente_id, clip_id),
  check (cliente_id <> creadora_id)
);
create index consultas_creadora_idx on public.consultas (creadora_id, ultimo_at desc);

alter table public.telegram_cuentas
  add constraint telegram_cuentas_consulta_fk
  foreign key (consulta_activa) references public.consultas (id) on delete set null;

create table public.consulta_mensajes (
  id           uuid primary key default gen_random_uuid(),
  consulta_id  uuid not null references public.consultas (id) on delete cascade,
  de           text not null check (de in ('cliente', 'creadora')),
  cuerpo       text not null check (char_length(cuerpo) between 1 and 4000),
  palabras     int not null,
  estado       text not null default 'enviado'
               check (estado in ('enviado', 'respondido', 'vencido')),
  cobro_coins  int not null default 0 check (cobro_coins >= 0),
  vence_at     timestamptz,
  respondido_at timestamptz,
  tg_msg_id    bigint,                      -- id del mensaje en el chat de DESTINO
  created_at   timestamptz not null default now()
);
create index consulta_mensajes_hilo_idx on public.consulta_mensajes (consulta_id, created_at);
create index consulta_mensajes_pendientes_idx
  on public.consulta_mensajes (vence_at) where de = 'cliente' and estado = 'enviado';

alter table public.consultas_config  enable row level security;
alter table public.telegram_cuentas  enable row level security;
alter table public.telegram_codigos  enable row level security;
alter table public.consultas         enable row level security;
alter table public.consulta_mensajes enable row level security;
revoke all on public.consultas_config  from anon, authenticated;
revoke all on public.telegram_cuentas  from anon, authenticated;
revoke all on public.telegram_codigos  from anon, authenticated;
revoke all on public.consultas         from anon, authenticated;
revoke all on public.consulta_mensajes from anon, authenticated;

-- ---------- Pieza interna: un codigo nuevo ----------

create or replace function public.telegram_codigo_nuevo(
  p_user uuid, p_rol text, p_clip uuid
) returns text language plpgsql security definer set search_path = '' as $$
declare codigo text; recientes int;
begin
  perform pg_advisory_xact_lock(hashtextextended('tgcodigo:' || p_user::text, 0));
  select count(*) into recientes from public.telegram_codigos
   where user_id = p_user and created_at > now() - interval '1 hour';
  if recientes >= 10 then
    raise exception 'Pediste muchos enlaces; intenta en un rato';
  end if;
  -- 64 hex de dos uuid v4 (aleatorios del servidor), sin guiones.
  codigo := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.telegram_codigos (hash, user_id, rol, clip_id, expira_at)
  values (encode(sha256(convert_to(codigo, 'UTF8')), 'hex'), p_user, p_rol, p_clip,
          now() + interval '15 minutes');
  return codigo;
end; $$;
revoke all on function public.telegram_codigo_nuevo(uuid, text, uuid) from public, anon, authenticated;

-- ---------- Para el navegador ----------

-- ¿Esta creadora ya puede recibir consultas?
create or replace function public.creadora_acepta_consultas(p_creadora uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.telegram_cuentas t where t.user_id = p_creadora)
     and public.cuenta_activa(p_creadora);
$$;
revoke all on function public.creadora_acepta_consultas(uuid) from public;
grant execute on function public.creadora_acepta_consultas(uuid) to anon, authenticated;

-- Quien consulta pide su enlace al bot para un clip.
create or replace function public.consulta_iniciar(p_clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); duenia uuid; codigo text; hilo uuid;
begin
  if yo is null then
    raise exception 'Entra para consultar' using errcode = 'insufficient_privilege';
  end if;
  if not public.cuenta_activa(yo) then
    raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion';
  end if;
  if not public.mayor_confirmada(yo) then
    raise exception 'Confirma que eres mayor de edad para continuar';
  end if;
  if not public.ficha_visible(p_clip) then
    raise exception 'Ese clip no esta disponible';
  end if;
  select c.creator_id into duenia from public.clips c where c.id = p_clip;
  if duenia = yo then raise exception 'No puedes consultarte a ti misma'; end if;
  if not public.creadora_acepta_consultas(duenia) then
    raise exception 'Esta creadora todavia no recibe consultas por Telegram';
  end if;

  insert into public.consultas (cliente_id, creadora_id, clip_id)
  values (yo, duenia, p_clip)
  on conflict (cliente_id, clip_id) do update set ultimo_at = now()
  returning id into hilo;

  codigo := public.telegram_codigo_nuevo(yo, 'cliente', p_clip);
  return jsonb_build_object('ok', true, 'codigo', codigo);
end; $$;
revoke all on function public.consulta_iniciar(uuid) from public, anon;
grant execute on function public.consulta_iniciar(uuid) to authenticated;

-- La creadora pide su enlace para vincular SU Telegram al bot.
create or replace function public.telegram_vincular()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  if not public.cuenta_activa(yo) then
    raise exception 'Tu cuenta esta suspendida o baneada: no puede hacer esta operacion';
  end if;
  if not exists (select 1 from public.profiles p where p.id = yo and p.is_creator) then
    raise exception 'Solo las creadoras vinculan Telegram para recibir consultas';
  end if;
  return jsonb_build_object('ok', true, 'codigo', public.telegram_codigo_nuevo(yo, 'creadora', null));
end; $$;
revoke all on function public.telegram_vincular() from public, anon;
grant execute on function public.telegram_vincular() to authenticated;

create or replace function public.telegram_estado()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('vinculada',
    exists (select 1 from public.telegram_cuentas t where t.user_id = auth.uid()));
$$;
revoke all on function public.telegram_estado() from public, anon;
grant execute on function public.telegram_estado() to authenticated;

create or replace function public.telegram_desvincular()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  delete from public.telegram_cuentas where user_id = auth.uid();
  delete from public.telegram_codigos where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.telegram_desvincular() from public, anon;
grant execute on function public.telegram_desvincular() to authenticated;

-- ---------- Para el bot (solo service_role) ----------

-- Canjea un codigo. Vincula el chat a la cuenta y, si es de cliente, deja esa
-- consulta como la activa.
create or replace function public.bot_canjear_codigo(p_codigo text, p_chat bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k record; hilo uuid; ajeno uuid; titulo text; handle text;
begin
  select * into k from public.telegram_codigos
   where hash = encode(sha256(convert_to(coalesce(p_codigo, ''), 'UTF8')), 'hex')
   for update;
  if k is null or k.usado_at is not null or k.expira_at < now() then
    return jsonb_build_object('ok', false, 'motivo', 'codigo');
  end if;
  if not public.cuenta_activa(k.user_id) then
    return jsonb_build_object('ok', false, 'motivo', 'cuenta');
  end if;

  select t.user_id into ajeno from public.telegram_cuentas t
   where t.chat_id = p_chat and t.user_id <> k.user_id;
  if ajeno is not null then
    return jsonb_build_object('ok', false, 'motivo', 'chat_ajeno');
  end if;

  if k.rol = 'cliente' then
    select q.id into hilo from public.consultas q
     where q.cliente_id = k.user_id and q.clip_id = k.clip_id;
  end if;

  insert into public.telegram_cuentas (user_id, chat_id, consulta_activa)
  values (k.user_id, p_chat, hilo)
  on conflict (user_id) do update
    set chat_id = excluded.chat_id,
        consulta_activa = coalesce(excluded.consulta_activa, public.telegram_cuentas.consulta_activa),
        vinculada_at = now();
  update public.telegram_codigos set usado_at = now() where hash = k.hash;

  if k.rol = 'cliente' then
    select c.title, p.handle into titulo, handle
      from public.clips c join public.profiles p on p.id = c.creator_id
     where c.id = k.clip_id;
  end if;
  return jsonb_build_object('ok', true, 'rol', k.rol, 'clip', titulo, 'creadora', handle);
end; $$;

-- Decide que es un mensaje que llega. Devuelve el contexto para validarlo.
create or replace function public.bot_enrutar(p_chat bigint, p_responde_a bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t record; cfg record; m record; q record; pendientes int; contexto jsonb;
  hay_m boolean := false;   -- `m is not null` falla si UNA columna es nula: se usa `found`
begin
  select * into cfg from public.consultas_config;
  select * into t from public.telegram_cuentas where chat_id = p_chat;
  if t is null then return jsonb_build_object('accion', 'nada', 'motivo', 'sin_vinculo'); end if;
  if not public.cuenta_activa(t.user_id) then
    return jsonb_build_object('accion', 'nada', 'motivo', 'cuenta');
  end if;

  -- 1) Responde a un mensaje reenviado por el bot a ESTA creadora.
  if p_responde_a is not null then
    select m2.* into m from public.consulta_mensajes m2
      join public.consultas q2 on q2.id = m2.consulta_id
     where m2.de = 'cliente' and m2.tg_msg_id = p_responde_a and q2.creadora_id = t.user_id;
    hay_m := found;
  end if;
  -- 2) Si no, y tiene exactamente un mensaje esperando respuesta, ese.
  if not hay_m then
    select count(*) into pendientes from public.consulta_mensajes m3
      join public.consultas q3 on q3.id = m3.consulta_id
     where m3.de = 'cliente' and m3.estado = 'enviado' and q3.creadora_id = t.user_id;
    -- Si tambien es cliente con una consulta activa, un mensaje suelto es del
    -- cliente; para contestar como creadora usa «Responder».
    if pendientes = 1 and t.consulta_activa is null then
      select m4.* into m from public.consulta_mensajes m4
        join public.consultas q4 on q4.id = m4.consulta_id
       where m4.de = 'cliente' and m4.estado = 'enviado' and q4.creadora_id = t.user_id;
      hay_m := found;
    end if;
  end if;

  if hay_m then
    select q5.* into q from public.consultas q5 where q5.id = m.consulta_id;
    if m.estado <> 'enviado' then
      return jsonb_build_object('accion', 'nada', 'motivo', 'ya_respondido');
    end if;
    return jsonb_build_object(
      'accion', 'creadora', 'mensaje', m.id, 'consulta', q.id,
      'pregunta', m.cuerpo,
      'cliente_chat', (select c.chat_id from public.telegram_cuentas c where c.user_id = q.cliente_id),
      'clip', (select c2.title from public.clips c2 where c2.id = q.clip_id),
      'creadora', (select p.handle from public.profiles p where p.id = q.creadora_id));
  end if;

  if t.consulta_activa is not null then
    select * into q from public.consultas where id = t.consulta_activa;
    if q is not null then
      select jsonb_agg(jsonb_build_object('de', x.de, 'cuerpo', left(x.cuerpo, 600)) order by x.created_at)
        into contexto
        from (select de, cuerpo, created_at from public.consulta_mensajes
               where consulta_id = q.id order by created_at desc limit 4) x;
      return jsonb_build_object(
        'accion', 'cliente', 'consulta', q.id, 'min_palabras', cfg.min_palabras,
        'creadora_chat', (select c.chat_id from public.telegram_cuentas c where c.user_id = q.creadora_id),
        'cliente', (select p.handle from public.profiles p where p.id = q.cliente_id),
        'clip', (select c2.title from public.clips c2 where c2.id = q.clip_id),
        'descripcion', (select c3.description from public.clips c3 where c3.id = q.clip_id),
        'creadora', (select p2.handle from public.profiles p2 where p2.id = q.creadora_id),
        'hilo', coalesce(contexto, '[]'::jsonb));
    end if;
  end if;
  return jsonb_build_object('accion', 'nada', 'motivo', 'sin_consulta');
end; $$;

-- Guarda un mensaje del cliente que ya paso la validacion.
create or replace function public.bot_registrar_cliente(p_consulta uuid, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cfg record; q record; limpio text; n int; nuevo uuid; recientes int;
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

  -- AQUI va el cobro cuando se defina (ver el encabezado). Hoy no se cobra.
  insert into public.consulta_mensajes (consulta_id, de, cuerpo, palabras, vence_at)
  values (q.id, 'cliente', limpio, n, now() + make_interval(hours => cfg.plazo_horas))
  returning id into nuevo;
  update public.consultas set ultimo_at = now() where id = q.id;
  return jsonb_build_object('ok', true, 'mensaje', nuevo, 'palabras', n);
end; $$;

-- Guarda la respuesta de la creadora y cierra el mensaje que contesta.
create or replace function public.bot_registrar_creadora(p_mensaje uuid, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m record; limpio text; n int;
begin
  limpio := regexp_replace(coalesce(p_cuerpo, ''),
    '^[\s ​‌‍⁠﻿]+|[\s ​‌‍⁠﻿]+$', '', 'g');
  select * into m from public.consulta_mensajes where id = p_mensaje for update;
  if not found or m.de <> 'cliente' or m.estado <> 'enviado' then
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
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.bot_marcar_tg(p_mensaje uuid, p_tg bigint)
returns void language sql security definer set search_path = '' as $$
  update public.consulta_mensajes set tg_msg_id = p_tg where id = p_mensaje;
$$;

-- Si Telegram no pudo entregar el mensaje, no queda como pendiente.
create or replace function public.bot_anular_mensaje(p_mensaje uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.consulta_mensajes where id = p_mensaje and de = 'cliente' and tg_msg_id is null;
$$;

-- Marca como vencidos los mensajes sin respuesta pasado el plazo y devuelve a
-- quienes hay que avisar. Cuando exista el cobro, aqui se reembolsa.
create or replace function public.consultas_vencer()
returns table (chat_cliente bigint, chat_creadora bigint, clip text, creadora text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with vencidos as (
    update public.consulta_mensajes m set estado = 'vencido'
     where m.de = 'cliente' and m.estado = 'enviado' and m.vence_at < now()
    returning m.consulta_id
  )
  select tc.chat_id, tr.chat_id, c.title, pr.handle
    from vencidos v
    join public.consultas q on q.id = v.consulta_id
    join public.clips c on c.id = q.clip_id
    join public.profiles pr on pr.id = q.creadora_id
    left join public.telegram_cuentas tc on tc.user_id = q.cliente_id
    left join public.telegram_cuentas tr on tr.user_id = q.creadora_id;
end; $$;

do $$
declare f text;
begin
  foreach f in array array[
    'bot_canjear_codigo(text, bigint)', 'bot_enrutar(bigint, bigint)',
    'bot_registrar_cliente(uuid, text)', 'bot_registrar_creadora(uuid, text)',
    'bot_marcar_tg(uuid, bigint)', 'bot_anular_mensaje(uuid)', 'consultas_vencer()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
