-- Aprobar la identidad tambien activa el perfil para publicar.
--
-- El problema: aprobar una verificacion solo marcaba `identidad_verificada`.
-- Para guardar un clip el servidor exige DOS cosas (`clips_insert_propio`:
-- `is_creator` y `identidad_verificada`), y `is_creator` solo lo activa la
-- persona con «Quiero publicar» en su Perfil. Quien llegaba a verificarse por
-- otro camino (el estudio, el retiro, el enlace de la pantalla de subida)
-- quedaba aprobada pero sin poder publicar, sin ningun aviso de por que.
--
-- La verificacion de identidad solo se ofrece a quien quiere publicar o cobrar
-- («Para publicar y para cobrar necesitamos comprobar que eres mayor de
-- edad»), asi que aprobarla implica ese papel. Ahora la misma funcion que
-- aprueba lo activa, y lo deja anotado en la bitacora.
--
-- Rechazar no cambia nada. Se mantiene todo lo demas de la funcion.
--
-- Ajuste unico de lo ya aprobado: las cuentas activas, no anonimizadas, con
-- identidad verificada y sin el perfil activado quedan activadas (hoy, las que
-- quedaron atoradas por esto). Es el mismo criterio de arriba aplicado hacia
-- atras, y se deshace con «Cambiar rol» o con el interruptor de Perfil.

create or replace function public.admin_resolver_verificacion(
  verificacion uuid, aprobar boolean, nota text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.verificaciones; activada boolean := false;
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
    select not p.is_creator into activada from public.profiles p where p.id = v.user_id;
    update public.profiles
       set identidad_verificada = true,
           identidad_verificada_at = now(),
           is_creator = true,
           curp_hash = coalesce(v.curp_hash, curp_hash),
           documento_hash = coalesce(v.documento_hash, documento_hash)
     where id = v.user_id;
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(),
          case when aprobar then 'verificacion_aprobada' else 'verificacion_rechazada' end,
          v.user_id, jsonb_build_object('verificacion', verificacion, 'nota', nota,
                                        'perfil_para_publicar_activado', coalesce(activada, false)));

  return jsonb_build_object('ok', true);
end;
$$;

-- Lo ya aprobado que quedo atorado.
update public.profiles
   set is_creator = true
 where identidad_verificada
   and not is_creator
   and anonimizada_at is null
   and baneado_at is null
   and suspended_at is null;
