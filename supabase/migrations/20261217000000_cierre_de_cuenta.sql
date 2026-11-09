-- Cerrar una cuenta con los ojos abiertos: diagnostico, consultas protegidas y
-- mensajes que dicen la verdad.
--
-- 1. HUECO. `profiles_no_borrar_con_historial` (20261120) no incluia las
--    consultas por Telegram: `consultas.cliente_id` / `.creadora_id` son
--    `on delete cascade`, asi que una cuenta cuyo unico rastro fueran hilos se
--    podia ELIMINAR y se llevaba los mensajes (y, con ellos, la evidencia de un
--    cobro o un reembolso). Ahora cuentan como historial igual que una compra.
--    `consulta_mensajes` cuelga de `consultas`, asi que basta con proteger esa.
--
-- 2. UNA SOLA LISTA. La lista de tablas con historial vivia dentro del
--    disparador. Pasa a `historial_de_cuenta()`, que usan el disparador, la
--    funcion de eliminar y el diagnostico: no pueden volver a desfasarse.
--
-- 3. DIAGNOSTICO de solo lectura (`admin_diagnostico_cierre`): lo que le impide
--    a ESTA cuenta anonimizarse o eliminarse. No sustituye a las reglas
--    transaccionales: anonimizar y eliminar siguen validando todo al ejecutarse.
--
-- 4. MENSAJE QUE DECIA UNA COSA FALSA. Anonimizar y eliminar decian «borralas
--    desde Verificacion», pero ahi no hay ninguna accion de borrado: las
--    imagenes las borra la funcion `borrar-verificacion` (al resolver la
--    solicitud, o a los 30 dias). El texto ahora dice eso. No se cambia ninguna
--    regla ni plazo, ni se ofrece borrar el expediente a mano.
--
-- Anonimizar y eliminar conservan exactamente las mismas reglas que antes; solo
-- cambia la redaccion de los mensajes (el saldo se dice en dolares, no en
-- centavos) y, en eliminar, el aviso previo de historial.

-- ---------- Una sola lista de historial ----------

create or replace function public.historial_de_cuenta(p_id uuid)
returns table (clase text, cuantos bigint)
language plpgsql stable security definer set search_path = '' as $$
declare t text; c text; etiqueta text; n bigint;
begin
  for t, c, etiqueta in
    select v.t, v.c, v.e from (values
      ('coin_ledger', 'user_id', 'movimientos de saldo'),
      ('purchases', 'user_id', 'compras'),
      ('rentals', 'user_id', 'rentas'),
      ('subscriptions', 'subscriber_id', 'suscripciones (como suscriptora)'),
      ('subscriptions', 'creator_id', 'suscripciones (como creadora)'),
      ('tips', 'de_id', 'propinas enviadas'),
      ('tips', 'para_id', 'propinas recibidas'),
      ('consentimientos', 'user_id', 'consentimientos'),
      ('payouts', 'creator_id', 'pagos a la creadora'),
      ('solicitudes_retiro', 'creator_id', 'solicitudes de retiro'),
      ('payment_orders', 'user_id', 'ordenes de pago'),
      ('reembolsos_retiro', 'user_id', 'reembolsos de retiro'),
      ('expedientes', 'user_id', 'expediente'),
      ('payout_accounts', 'user_id', 'cuenta de cobro'),
      ('custom_requests', 'fan_id', 'encargos (como cliente)'),
      ('custom_requests', 'creator_id', 'encargos (como creadora)'),
      ('reportes', 'reporta_id', 'reportes enviados'),
      ('reportes', 'perfil_id', 'reportes recibidos'),
      ('consultas', 'cliente_id', 'consultas por Telegram (como cliente)'),
      ('consultas', 'creadora_id', 'consultas por Telegram (como creadora)')
    ) as v(t, c, e)
  loop
    execute format('select count(*) from public.%I where %I = $1', t, c) into n using p_id;
    clase := etiqueta; cuantos := n;
    return next;
  end loop;
end; $$;
revoke all on function public.historial_de_cuenta(uuid) from public, anon, authenticated;

comment on function public.historial_de_cuenta is
  'Lo que una cuenta tiene y NO se borra con ella, por clase y cantidad. La usan el disparador profiles_no_borrar_con_historial, admin_eliminar_cuenta y admin_diagnostico_cierre. Si se agrega una tabla con historial de personas, se agrega AQUI.';

create or replace function public.profiles_no_borrar_con_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare protegido text;
begin
  if old.es_demo then return old; end if;
  select string_agg(h.clase, ', ' order by h.clase) into protegido
    from public.historial_de_cuenta(old.id) h where h.cuantos > 0;
  if protegido is not null then
    raise exception 'Esta cuenta tiene historial que se conserva (%). Usa Anonimizar en lugar de eliminarla.', protegido
      using errcode = 'restrict_violation';
  end if;
  return old;
end; $$;
revoke all on function public.profiles_no_borrar_con_historial() from public, anon, authenticated;

-- ---------- Diagnostico de cierre (solo lectura) ----------

create or replace function public.admin_diagnostico_cierre(objetivo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  hist jsonb;
  v_con int; v_abiertas int; v_plazo timestamptz;
  clips_hist int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver este diagnostico'
      using errcode = 'insufficient_privilege';
  end if;
  select * into p from public.profiles where id = objetivo;
  if p.id is null then return jsonb_build_object('existe', false); end if;

  select coalesce(jsonb_agg(jsonb_build_object('clase', h.clase, 'cuantos', h.cuantos)
                            order by h.clase), '[]'::jsonb)
    into hist from public.historial_de_cuenta(objetivo) h where h.cuantos > 0;

  select count(*)::int,
         count(*) filter (where v.estado::text in ('pendiente_revision', 'procesando'))::int,
         min(v.borrar_despues_de)
    into v_con, v_abiertas, v_plazo
    from public.verificaciones v
   where v.user_id = objetivo and v.imagenes_borradas_at is null
     and (v.ine_path is not null or v.selfie_path is not null);

  select count(*)::int into clips_hist
    from public.clips c
   where c.creator_id = objetivo
     and (exists (select 1 from public.purchases x where x.clip_id = c.id)
       or exists (select 1 from public.rentals x where x.clip_id = c.id)
       or exists (select 1 from public.reportes x where x.clip_id = c.id)
       or exists (select 1 from public.reembolsos_retiro x where x.clip_id = c.id));

  return jsonb_build_object(
    'existe', true,
    'handle', p.handle,
    'es_propia', objetivo = auth.uid(),
    'es_admin', public.es_admin(objetivo),
    'es_demo', p.es_demo,
    'anonimizada', p.anonimizada_at is not null,
    'saldo', public.saldo(objetivo),
    'retiros_abiertos', (select count(*) from public.solicitudes_retiro s
                          where s.creator_id = objetivo and s.estado in ('pendiente', 'aprobada')),
    'verificaciones_con_imagenes', v_con,
    'verificaciones_sin_resolver', v_abiertas,
    'imagenes_se_borran_el', v_plazo,
    'historial', hist,
    'clips_con_historial', clips_hist
  );
end; $$;
revoke all on function public.admin_diagnostico_cierre(uuid) from public, anon;
grant execute on function public.admin_diagnostico_cierre(uuid) to authenticated;

comment on function public.admin_diagnostico_cierre is
  'Solo lectura: que impide anonimizar o eliminar a esta cuenta (saldo, retiros, imagenes de verificacion, historial). No sustituye a las reglas de admin_anonimizar_cuenta / admin_eliminar_cuenta, que vuelven a validar.';

-- ---------- Anonimizar: mismo cuerpo, mensaje de imagenes corregido ----------

create or replace function public.admin_anonimizar_cuenta(objetivo uuid, motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  restante int;
  clips_cerrados int;
  subs_canceladas int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede anonimizar cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(motivo), '') = '' then
    raise exception 'Anonimizar una cuenta necesita un motivo escrito';
  end if;
  if objetivo = auth.uid() then raise exception 'No puedes anonimizar tu propia cuenta'; end if;
  if public.es_admin(objetivo) then raise exception 'Primero revoca el privilegio de administrador'; end if;

  select * into p from public.profiles where id = objetivo;
  if p.id is null then raise exception 'Ese usuario no existe'; end if;
  if p.anonimizada_at is not null then raise exception 'Esa cuenta ya esta anonimizada'; end if;

  restante := public.saldo(objetivo);
  if restante <> 0 then
    raise exception 'La cuenta tiene un saldo de $%: reembolsa o liquida antes de anonimizarla', to_char(restante / 100.0, 'FM999,999,990.00');
  end if;
  if exists (select 1 from public.solicitudes_retiro s
              where s.creator_id = objetivo and s.estado in ('pendiente', 'aprobada')) then
    raise exception 'La cuenta tiene un retiro sin resolver: resuelvelo antes de anonimizarla';
  end if;
  if exists (select 1 from public.verificaciones v
              where v.user_id = objetivo and v.imagenes_borradas_at is null
                and (v.ine_path is not null or v.selfie_path is not null)) then
    raise exception 'Hay imagenes de verificacion que todavia no se borran. Se borran solas cuando la solicitud se resuelve en Verificacion (aprobarla o rechazarla) y, si ya esta resuelta, en la siguiente pasada automatica. Vuelve a intentarlo despues.';
  end if;

  update public.profiles
     set handle = 'eliminada_' || substr(replace(id::text, '-', ''), 1, 8),
         display_name = 'Cuenta eliminada', bio = null, avatar_path = null,
         curp_hash = null, documento_hash = null,
         baneado_at = coalesce(baneado_at, now()),
         baneado_motivo = coalesce(baneado_motivo, 'Cuenta eliminada'),
         anonimizada_at = now()
   where id = objetivo;

  delete from public.contactos where user_id = objetivo;
  delete from public.posts where creator_id = objetivo;

  update public.clips
     set borrado_at = coalesce(borrado_at, now()), borrado_por = coalesce(borrado_por, auth.uid()),
         borrado_motivo = coalesce(borrado_motivo, 'Cuenta eliminada'),
         purgar_despues_de = coalesce(purgar_despues_de, now() + interval '30 days'),
         destacado_orden = null, destacado_desde = null
   where creator_id = objetivo and borrado_at is null;
  get diagnostics clips_cerrados = row_count;

  update public.subscriptions set estado = 'cancelada', updated_at = now()
   where (subscriber_id = objetivo or creator_id = objetivo) and estado in ('activa', 'pendiente');
  get diagnostics subs_canceladas = row_count;

  -- La identidad de acceso: correo, telefono y sesiones. El usuario de auth NO
  -- se borra, para que el historial siga apuntando a una fila que existe.
  update auth.users
     set email = 'eliminada-' || objetivo::text || '@eliminada.invalid',
         phone = null, encrypted_password = '', raw_user_meta_data = '{}'::jsonb,
         updated_at = now()
   where id = objetivo;
  if exists (select 1 from information_schema.columns
              where table_schema = 'auth' and table_name = 'users' and column_name = 'banned_until') then
    execute 'update auth.users set banned_until = ''infinity'' where id = $1' using objetivo;
  end if;
  delete from auth.identities where user_id = objetivo;
  if to_regclass('auth.sessions') is not null then
    execute 'delete from auth.sessions where user_id = $1' using objetivo;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'anonimizar_cuenta', objetivo,
          jsonb_build_object('motivo', motivo, 'clips_cerrados', clips_cerrados,
                             'suscripciones_canceladas', subs_canceladas));
  return jsonb_build_object('ok', true, 'clips_cerrados', clips_cerrados,
                            'suscripciones_canceladas', subs_canceladas);
end; $$;
revoke all on function public.admin_anonimizar_cuenta(uuid, text) from public, anon;
grant execute on function public.admin_anonimizar_cuenta(uuid, text) to authenticated;

-- ---------- Eliminar: pre-aviso de historial y mensajes ----------

create or replace function public.admin_eliminar_cuenta(
  objetivo uuid, motivo text, confirmar text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  archivos jsonb;
  n_clips int;
  restrictivo text;
  protegido text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede eliminar cuentas'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(motivo), '') = '' then
    raise exception 'Eliminar una cuenta necesita un motivo escrito';
  end if;
  if objetivo = auth.uid() then raise exception 'No puedes eliminar tu propia cuenta'; end if;
  if public.es_admin(objetivo) then raise exception 'Primero revoca el privilegio de administrador'; end if;

  select * into p from public.profiles where id = objetivo;
  if p.id is null then raise exception 'Ese usuario no existe'; end if;
  if lower(trim(coalesce(confirmar, ''))) <> lower(p.handle) then
    raise exception 'Escribe el usuario de la cuenta (@%) para confirmar', p.handle;
  end if;
  if exists (select 1 from public.verificaciones v
              where v.user_id = objetivo and v.imagenes_borradas_at is null
                and (v.ine_path is not null or v.selfie_path is not null)) then
    raise exception 'Hay imagenes de verificacion que todavia no se borran. Se borran solas cuando la solicitud se resuelve en Verificacion (aprobarla o rechazarla) y, si ya esta resuelta, en la siguiente pasada automatica. Vuelve a intentarlo despues.';
  end if;

  -- El historial que se conserva se comprueba AQUI, antes de tocar nada, para
  -- poder decir cual es (el disparador de profiles sigue siendo la red de
  -- seguridad para cualquier otra via de borrado). Las cuentas de demostracion
  -- se pueden borrar enteras, como en el disparador.
  if not p.es_demo then
    select string_agg(h.clase || ' (' || h.cuantos || ')', ', ' order by h.clase)
      into protegido
      from public.historial_de_cuenta(objetivo) h where h.cuantos > 0;
    if protegido is not null then
      raise exception 'Esta cuenta tiene historial que se conserva: %. Eso no se borra; usa Anonimizar.', protegido;
    end if;
  end if;

  -- Lo que la cuenta tiene guardado, ANTES de borrar.
  select coalesce(jsonb_agg(jsonb_build_object('bucket', o.bucket_id, 'ruta', o.name)), '[]'::jsonb)
    into archivos
    from storage.objects o
   where o.name like objetivo::text || '/%';
  select count(*) into n_clips from public.clips c where c.creator_id = objetivo;

  begin
    delete from auth.users where id = objetivo;
  exception
    when restrict_violation then
      -- Si lo lanzo el disparador, su mensaje ya dice que clase de historial es.
      -- Una restriccion ajena (ON DELETE RESTRICT) no trae un mensaje legible.
      if sqlerrm like 'Esta cuenta tiene historial%' then
        raise exception '%', sqlerrm;
      end if;
      raise exception 'Esta cuenta tiene registros que se conservan y la base no deja borrarla. Usa Anonimizar en lugar de eliminarla.';
    when foreign_key_violation then
      get stacked diagnostics restrictivo = constraint_name;
      raise exception 'No se puede eliminar: hay registros que dependen de esta cuenta (%) — por ejemplo clips con compras, rentas o reportes. Usa Anonimizar.', restrictivo;
  end;
  -- El disparador de clips con historial CANCELA el borrado de la fila sin
  -- error; si la cuenta sigue ahi, algo la retuvo.
  if exists (select 1 from public.profiles where id = objetivo) then
    raise exception 'No se pudo eliminar: la cuenta sigue teniendo registros que se conservan. Usa Anonimizar.';
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'eliminar_cuenta', null,
          jsonb_build_object('id', objetivo, 'handle', p.handle, 'motivo', motivo,
                             'clips', n_clips, 'archivos', jsonb_array_length(archivos)));

  return jsonb_build_object('ok', true, 'handle', p.handle, 'archivos', archivos);
end; $$;
revoke all on function public.admin_eliminar_cuenta(uuid, text, text) from public, anon;
grant execute on function public.admin_eliminar_cuenta(uuid, text, text) to authenticated;
