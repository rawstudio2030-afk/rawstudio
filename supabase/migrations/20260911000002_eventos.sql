-- Eventos de la bitacora.
--
-- La IP se rellena con un DISPARADOR y no editando cada funcion. Hay catorce
-- que escriben en admin_log; tocarlas una por una para agregar una columna es
-- catorce oportunidades de equivocarse, y cualquier funcion futura naceria sin
-- IP hasta que alguien se acordara. Asi la cobertura es total y automatica.

create or replace function public.admin_log_pone_ip()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.ip is null then
    new.ip := public.ip_solicitante();
  end if;
  if new.ip is null then
    -- Se deja constancia de que falto, en vez de fingir que no aplicaba.
    -- Un evento sin IP se registra igual: perder el registro es peor.
    new.detalle := coalesce(new.detalle,'{}'::jsonb) || '{"ip_ausente":true}'::jsonb;
  end if;
  return new;
end; $$;

drop trigger if exists admin_log_pone_ip on public.admin_log;
create trigger admin_log_pone_ip
  before insert on public.admin_log
  for each row execute function public.admin_log_pone_ip();

-- ---------- Alta de cuenta ----------

-- Va sobre profiles y no sobre auth.users porque admin_log referencia al
-- perfil: sobre auth.users la fila del perfil aun no existiria.
create or replace function public.registra_alta_cuenta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (new.id, 'crear_cuenta', new.id,
          jsonb_build_object('handle', new.handle,
                             'pais', public.pais_solicitante()));
  return new;
exception when others then
  -- Que la bitacora falle jamas debe impedir que alguien se registre.
  return new;
end; $$;

drop trigger if exists profiles_registra_alta on public.profiles;
create trigger profiles_registra_alta
  after insert on public.profiles
  for each row execute function public.registra_alta_cuenta();

-- ---------- Subida de clip ----------

create or replace function public.registra_subida_clip()
returns trigger language plpgsql security definer set search_path = '' as $$
declare quien uuid := coalesce(auth.uid(), new.creator_id);
begin
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (quien, 'subir_clip', new.creator_id,
          jsonb_build_object('clip', new.id, 'titulo', new.title,
                             'visibilidad', new.visibility,
                             -- Cuando el actor no es la creadora, es que un
                             -- administrador publico por ella. Se anota.
                             'por_administracion', quien is distinct from new.creator_id));
  return new;
exception when others then return new;
end; $$;

drop trigger if exists clips_registra_subida on public.clips;
create trigger clips_registra_subida
  after insert on public.clips
  for each row execute function public.registra_subida_clip();

-- ---------- Inicio de sesion ----------

-- Supabase tiene auth.audit_log_entries con columna de IP, pero en este
-- proyecto esta vacia: no la esta poblando. Por eso el acceso se registra
-- desde aqui, con una llamada del cliente justo despues de entrar. La IP no
-- la manda el cliente —no la conoce— sino que se lee de las cabeceras.
create or replace function public.registrar_acceso(metodo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare quien uuid := auth.uid();
begin
  if quien is null then return; end if;
  -- No se anota dos veces el mismo acceso si la aplicacion se recarga: se
  -- ignora si ya hubo uno de esta persona en los ultimos diez minutos.
  if exists (select 1 from public.admin_log l
              where l.admin_id = quien and l.accion = 'iniciar_sesion'
                and l.created_at > now() - interval '10 minutes') then
    return;
  end if;
  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (quien, 'iniciar_sesion', quien,
          jsonb_build_object('metodo', coalesce(metodo, 'desconocido'),
                             'pais', public.pais_solicitante()));
end; $$;
revoke all on function public.registrar_acceso(text) from public, anon;
grant execute on function public.registrar_acceso(text) to authenticated;
