-- Borrar una cuenta o un clip ya no destruye el historial.
--
-- Hasta ahora, borrar el usuario de `auth.users` arrastraba por cascada su
-- libro de movimientos, sus compras, sus consentimientos, sus retiros y su
-- expediente; y borrar un clip vendido arrastraba las compras, las rentas, los
-- reportes y los reembolsos que dependian de el. Eso es la evidencia que se
-- necesita para una disputa, una auditoria fiscal o una investigacion, y
-- quien la destruia podia ser justo la persona reportada.
--
-- - Una cuenta con historial no se borra: se ANONIMIZA (`admin_anonimizar_cuenta`),
--   que quita lo que identifica a la persona y deja intacto lo que se conserva.
--   Las cuentas de demostracion (`es_demo`) se siguen pudiendo borrar enteras.
-- - Un clip con compras, rentas, reportes o reembolsos no se borra: pasa a
--   "borrado" (lo mismo que hace administracion), y los archivos siguen la
--   purga a 30 dias de siempre.
--
-- CUANTO TIEMPO se conserva el historial es una decision legal y fiscal que
-- esta migracion NO toma: lo conserva sin plazo. Cuando se defina, la purga se
-- agrega aparte.

alter table public.profiles add column if not exists anonimizada_at timestamptz;

-- ---------- Cuentas: no se borran con historial ----------

create or replace function public.profiles_no_borrar_con_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t text; c text; hay boolean;
begin
  if old.es_demo then return old; end if;
  for t, c in
    select v.t, v.c from (values
      ('coin_ledger', 'user_id'), ('purchases', 'user_id'), ('rentals', 'user_id'),
      ('subscriptions', 'subscriber_id'), ('subscriptions', 'creator_id'),
      ('tips', 'de_id'), ('tips', 'para_id'), ('consentimientos', 'user_id'),
      ('payouts', 'creator_id'), ('solicitudes_retiro', 'creator_id'),
      ('payment_orders', 'user_id'), ('reembolsos_retiro', 'user_id'),
      ('expedientes', 'user_id'), ('payout_accounts', 'user_id'),
      ('custom_requests', 'fan_id'), ('custom_requests', 'creator_id'),
      ('reportes', 'reporta_id'), ('reportes', 'perfil_id')
    ) as v(t, c)
  loop
    execute format('select exists (select 1 from public.%I where %I = $1)', t, c)
      into hay using old.id;
    if hay then
      raise exception 'Esta cuenta tiene historial que se conserva (%). Usa admin_anonimizar_cuenta en lugar de borrarla.', t
        using errcode = 'restrict_violation';
    end if;
  end loop;
  return old;
end; $$;
revoke all on function public.profiles_no_borrar_con_historial() from public, anon, authenticated;

drop trigger if exists profiles_no_borrar_con_historial on public.profiles;
create trigger profiles_no_borrar_con_historial
  before delete on public.profiles
  for each row execute function public.profiles_no_borrar_con_historial();

-- ---------- Clips: con historial, se marcan borrados ----------

create or replace function public.clips_no_borrar_con_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.purchases p where p.clip_id = old.id)
  or exists (select 1 from public.rentals r where r.clip_id = old.id)
  or exists (select 1 from public.reportes x where x.clip_id = old.id)
  or exists (select 1 from public.reembolsos_retiro e where e.clip_id = old.id) then
    update public.clips
       set borrado_at        = coalesce(borrado_at, now()),
           borrado_por       = coalesce(borrado_por, auth.uid()),
           borrado_motivo    = coalesce(borrado_motivo, 'Borrado por quien lo subio'),
           purgar_despues_de = coalesce(purgar_despues_de, now() + interval '30 days'),
           destacado_orden   = null, destacado_desde = null
     where id = old.id;
    return null;  -- cancela el DELETE: la fila se queda
  end if;
  return old;
end; $$;
revoke all on function public.clips_no_borrar_con_historial() from public, anon, authenticated;

drop trigger if exists clips_no_borrar_con_historial on public.clips;
create trigger clips_no_borrar_con_historial
  before delete on public.clips
  for each row execute function public.clips_no_borrar_con_historial();

-- ---------- Anonimizar una cuenta ----------
--
-- Quita lo que identifica a la persona y cierra la cuenta. Conserva el libro de
-- movimientos, las compras, los retiros, los consentimientos, la cuenta de
-- cobro y el expediente: son los registros que no se pueden destruir.
--
-- Se niega mientras haya saldo, un retiro por resolver o imagenes de
-- verificacion sin borrar (esas las borra la funcion de borde, no SQL).

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
    raise exception 'La cuenta tiene un saldo de % centavos: reembolsa o liquida antes de anonimizarla', restante;
  end if;
  if exists (select 1 from public.solicitudes_retiro s
              where s.creator_id = objetivo and s.estado in ('pendiente', 'aprobada')) then
    raise exception 'La cuenta tiene un retiro sin resolver: resuelvelo antes de anonimizarla';
  end if;
  if exists (select 1 from public.verificaciones v
              where v.user_id = objetivo and v.imagenes_borradas_at is null
                and (v.ine_path is not null or v.selfie_path is not null)) then
    raise exception 'Hay imagenes de verificacion sin borrar: borralas desde Verificacion antes de anonimizar';
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
