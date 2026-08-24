-- La verificación deja de pedir CURP y pide fecha de nacimiento.
--
-- La CURP es un dato mexicano: quien viene de fuera no la tiene, y mucha gente
-- de México no se la sabe de memoria. Como primer campo de un registro, es un
-- muro.
--
-- Lo que se pierde y por qué no importa aquí: la CURP se validaba sola —trae
-- dígito verificador y la fecha adentro—. Una fecha escrita a mano no. Pero la
-- prueba nunca fue el dato tecleado sino el documento, y ese lo revisa una
-- persona de todos modos.

alter table public.verificaciones
  add column fecha_nacimiento date,
  -- Sustituye a curp_hash para detectar cuentas duplicadas. Es opcional: sirve
  -- con CURP, pasaporte o cualquier documento, y guarda solo la huella.
  add column documento_hash text;

comment on column public.verificaciones.documento_hash is
  'SHA-256 del número de documento, cuando se proporciona. Detecta cuentas duplicadas sin poder reconstruir el dato.';

alter table public.profiles
  add column documento_hash text;

create unique index profiles_documento_hash_idx on public.profiles (documento_hash)
  where documento_hash is not null;

-- El blindaje cubre también la columna nueva.
create or replace function public.profiles_proteger_columnas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claims text := current_setting('request.jwt.claims', true);
  rol    text := current_setting('request.jwt.claim.role', true);
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if claims is not null
     and coalesce(rol, claims::json->>'role', '') <> 'service_role'
     and not public.es_admin()
  then
    new.verified                := old.verified;
    new.suspended_at            := old.suspended_at;
    new.suspended_reason        := old.suspended_reason;
    new.identidad_verificada    := old.identidad_verificada;
    new.identidad_verificada_at := old.identidad_verificada_at;
    new.curp_hash               := old.curp_hash;
    new.documento_hash          := old.documento_hash;
  end if;

  return new;
end;
$$;

-- Nueva solicitud: fecha de nacimiento obligatoria, documento opcional.
create or replace function public.solicitar_verificacion_v2(
  nacimiento date, ine text, selfie text, documento text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  hash text;
  edad int;
  pendientes int;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;
  if (select identidad_verificada from public.profiles where id = yo) then
    raise exception 'Tu identidad ya está verificada';
  end if;

  if nacimiento is null or nacimiento > current_date then
    raise exception 'La fecha de nacimiento no es válida';
  end if;
  edad := extract(year from age(current_date, nacimiento));
  if edad > 120 then raise exception 'La fecha de nacimiento no es válida'; end if;
  if edad < 18 then
    raise exception 'Debes ser mayor de 18 años para publicar en RAWstudio';
  end if;

  select count(*) into pendientes from public.verificaciones
   where user_id = yo and estado in ('procesando', 'pendiente_revision');
  if pendientes > 0 then
    raise exception 'Ya tienes una verificación en revisión. Te avisamos en cuanto se resuelva.';
  end if;

  if documento is not null and trim(documento) <> '' then
    -- El hash se calcula en el servidor: el número en claro no viaja más allá
    -- de esta llamada ni queda en ninguna tabla.
    hash := encode(extensions.digest(upper(trim(documento)), 'sha256'), 'hex');
    if exists (select 1 from public.profiles
               where documento_hash = hash and id <> yo) then
      raise exception 'Ese documento ya está registrado en otra cuenta';
    end if;
  end if;

  insert into public.verificaciones
    (user_id, estado, fecha_nacimiento, edad, documento_hash,
     ine_path, selfie_path, motivo, borrar_despues_de)
  values
    (yo, 'pendiente_revision', nacimiento, edad, hash,
     ine, selfie, 'Revisión manual', now() + interval '30 days');

  return jsonb_build_object('ok', true, 'estado', 'pendiente_revision', 'edad', edad);
end;
$$;

revoke all on function public.solicitar_verificacion_v2(date, text, text, text) from public, anon;
grant execute on function public.solicitar_verificacion_v2(date, text, text, text) to authenticated;

-- Al aprobar, se copia el hash del documento si lo hubo.
create or replace function public.admin_resolver_verificacion(
  verificacion uuid, aprobar boolean, nota text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.verificaciones;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede resolver verificaciones'
      using errcode = 'insufficient_privilege';
  end if;
  select * into v from public.verificaciones where id = verificacion;
  if v.id is null then raise exception 'Esa verificación no existe'; end if;
  if v.estado <> 'pendiente_revision' then
    raise exception 'Esa verificación ya fue resuelta';
  end if;

  update public.verificaciones
     set estado = (case when aprobar then 'aprobada' else 'rechazada' end)::public.estado_verificacion,
         revisada_por = auth.uid(), revisada_at = now(), nota_revision = nota,
         borrar_despues_de = now()
   where id = verificacion;

  if aprobar then
    update public.profiles
       set identidad_verificada = true,
           identidad_verificada_at = now(),
           curp_hash = coalesce(v.curp_hash, curp_hash),
           documento_hash = coalesce(v.documento_hash, documento_hash)
     where id = v.user_id;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(),
          case when aprobar then 'verificacion_aprobada' else 'verificacion_rechazada' end,
          v.user_id, jsonb_build_object('verificacion', verificacion, 'nota', nota));

  return jsonb_build_object('ok', true);
end;
$$;
