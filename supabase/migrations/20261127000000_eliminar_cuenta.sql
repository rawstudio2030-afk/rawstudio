-- Eliminar una cuenta DEFINITIVAMENTE desde el panel.
--
-- Hasta ahora administracion solo podia anonimizar. Esto agrega el borrado de
-- verdad, pero solo para cuentas que NO tienen historial que se conserva
-- (cuentas de prueba, registros que nunca hicieron nada): el disparador
-- `profiles_no_borrar_con_historial` sigue mandando, y esta funcion no lo
-- esquiva. Una cuenta con libro de movimientos, compras, consentimientos,
-- retiros, expediente, etc. se sigue ANONIMIZANDO: ese registro no se destruye
-- (lo decidio la migracion 20261120).
--
-- Salvaguardas:
-- - Solo administracion, con motivo escrito y escribiendo el usuario de la
--   cuenta como confirmacion.
-- - No la propia cuenta ni la de otra administradora (primero se le revoca).
-- - Si hay imagenes de verificacion sin borrar, se niega (como anonimizar):
--   se borran antes desde Verificacion.
-- - Es una sola transaccion: o se borra todo lo que cuelga de la cuenta o no se
--   borra nada. Un clip con compras, rentas, reportes o reembolsos tambien
--   impide el borrado.
--
-- Los ARCHIVOS no se pueden borrar desde SQL (quedarian en el almacenamiento
-- aunque se quite su fila). Por eso la funcion devuelve la lista de archivos
-- que la cuenta tenia (todo lo que vive bajo `<id>/` en los buckets) y es el
-- panel quien los quita con la API de almacenamiento, ya con la cuenta borrada.
--
-- Queda constancia en la bitacora (con el usuario y el motivo); la fila de
-- bitacora conserva el detalle aunque su `objetivo` pase a nulo al borrarse la
-- cuenta.

create or replace function public.admin_eliminar_cuenta(
  objetivo uuid, motivo text, confirmar text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  archivos jsonb;
  n_clips int;
  restrictivo text;
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
    raise exception 'Hay imagenes de verificacion sin borrar: borralas desde Verificacion antes de eliminar';
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
      raise exception 'Esta cuenta tiene historial que se conserva (compras, movimientos, retiros, consentimientos, expediente o reportes). Usa Anonimizar en lugar de eliminarla.';
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
