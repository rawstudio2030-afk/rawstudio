-- Corrige un error de tipos en admin_resolver_verificacion.
--
-- El CASE devolvia texto y la columna es un tipo enumerado. En un INSERT
-- Postgres convierte el literal solo, pero en el resultado de un CASE dentro de
-- un UPDATE no: hay que decirselo. Sin el cast, resolver cualquier verificacion
-- fallaba con 42804.
create or replace function public.admin_resolver_verificacion(
  verificacion uuid, aprobar boolean, nota text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.verificaciones;
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
           curp_hash = coalesce(v.curp_hash, curp_hash)
     where id = v.user_id;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(),
          case when aprobar then 'verificacion_aprobada' else 'verificacion_rechazada' end,
          v.user_id, jsonb_build_object('verificacion', verificacion, 'nota', nota));

  return jsonb_build_object('ok', true);
end;
$$;
