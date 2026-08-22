-- Verificacion en modo manual, sin microservicio.
--
-- Con una plataforma que aun no tiene creadoras, pagar hospedaje para modelos
-- de vision es gastar antes de tiempo. Y la revision humana es MAS confiable
-- que un cotejo open source: la diferencia es que no escala, y con pocas
-- creadoras eso no importa todavia.
--
-- Cuando el volumen crezca, el microservicio se conecta y este camino queda
-- como respaldo: el esquema ya contempla ambos.

-- La persona sube sus imagenes a su propia carpeta del bucket privado. Leerlas
-- sigue siendo exclusivo del admin: subir y ver son permisos distintos, y aqui
-- ni la dueña necesita volver a verlas.
create policy verif_subir_propio on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verificacion'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Solicitud de verificacion. Va por funcion porque la tabla no acepta
-- escritura del cliente: si la aceptara, bastaria un PATCH para declararse
-- aprobada.
create or replace function public.solicitar_verificacion(
  curp text, ine text, selfie text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  hash text;
  pendientes int;
begin
  if yo is null then
    raise exception 'Necesitas entrar' using errcode = 'insufficient_privilege';
  end if;

  if (select identidad_verificada from public.profiles where id = yo) then
    raise exception 'Tu identidad ya está verificada';
  end if;

  -- Una a la vez: sin esto, alguien podria saturar la cola de revision.
  select count(*) into pendientes from public.verificaciones
   where user_id = yo and estado in ('procesando', 'pendiente_revision');
  if pendientes > 0 then
    raise exception 'Ya tienes una verificación en revisión. Te avisamos en cuanto se resuelva.';
  end if;

  -- El hash se calcula en el servidor, no en el navegador: asi la CURP en
  -- claro no viaja mas alla de esta llamada ni queda en ninguna tabla.
  hash := encode(extensions.digest(upper(trim(curp)), 'sha256'), 'hex');

  if exists (select 1 from public.profiles
             where curp_hash = hash and id <> yo) then
    raise exception 'Esa CURP ya está registrada en otra cuenta';
  end if;

  insert into public.verificaciones
    (user_id, estado, curp_hash, ine_path, selfie_path, motivo,
     borrar_despues_de)
  values
    (yo, 'pendiente_revision', hash, ine, selfie,
     'Revisión manual',
     now() + interval '30 days');   -- red de seguridad si nadie la resuelve

  return jsonb_build_object('ok', true, 'estado', 'pendiente_revision');
end;
$$;

revoke all on function public.solicitar_verificacion(text, text, text) from public, anon;
grant execute on function public.solicitar_verificacion(text, text, text) to authenticated;
