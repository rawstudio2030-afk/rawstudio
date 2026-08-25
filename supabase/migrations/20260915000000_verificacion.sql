-- Modulo 9: verificacion de identidad y edad.
--
-- LA REGLA QUE FALTABA. La especificacion dice que una creadora no verificada
-- no puede publicar ni cobrar, y solo la mitad se cumplia: sus clips nacian
-- pendientes, pero nada impedia que un administrador se los aprobara ni que
-- recibiera propinas. Se aplica ahora en el backend, que es donde tiene que
-- estar: en la interfaz seria una sugerencia.

-- ---------- No se aprueba contenido de quien no esta verificada ----------

create or replace function public.admin_moderar(
  clip uuid, decision public.estado_clip, motivo text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid; verificada boolean;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede moderar'
      using errcode = 'insufficient_privilege';
  end if;
  if decision in ('rechazado','retirado') and coalesce(trim(motivo),'') = '' then
    raise exception 'Un rechazo o retiro necesita motivo: se le comunica a la creadora';
  end if;

  select c.creator_id, p.identidad_verificada into duenia, verificada
    from public.clips c join public.profiles p on p.id = c.creator_id
   where c.id = clip;
  if duenia is null then raise exception 'Ese clip no existe'; end if;

  -- Aqui y no en la interfaz: publicar contenido adulto de alguien cuya edad
  -- no se ha comprobado es el riesgo mas serio de esta plataforma, y no puede
  -- depender de que quien modera se acuerde de mirar.
  if decision = 'aprobado' and not coalesce(verificada, false) then
    raise exception 'No se puede aprobar: la creadora todavia no tiene la identidad verificada';
  end if;

  update public.clips
     set estado = decision,
         motivo_rechazo = case when decision in ('rechazado','retirado') then motivo else null end,
         revisado_por = auth.uid(), revisado_at = now()
   where id = clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'moderar_clip', duenia,
          jsonb_build_object('clip', clip, 'decision', decision, 'motivo', motivo));
  return jsonb_build_object('ok', true, 'estado', decision);
end; $$;
revoke all on function public.admin_moderar(uuid, public.estado_clip, text) from public, anon;
grant execute on function public.admin_moderar(uuid, public.estado_clip, text) to authenticated;

-- ---------- Ni se le acredita dinero ----------

create or replace function public.puede_cobrar(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.identidad_verificada from public.profiles p where p.id = uid), false);
$$;

create or replace function public.propina_exige_verificacion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Se comprueba sobre el libro contable y no dentro de cada funcion de
  -- cobro: asi cualquier via futura de acreditar dinero queda cubierta sin
  -- que nadie tenga que acordarse de agregar la comprobacion.
  if new.delta > 0 and new.motivo in ('venta_clip','propina')
     and not public.puede_cobrar(new.user_id) then
    raise exception 'Esa creadora todavia no tiene la identidad verificada, asi que no puede recibir pagos'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists ledger_exige_verificacion on public.coin_ledger;
create trigger ledger_exige_verificacion
  before insert on public.coin_ledger
  for each row execute function public.propina_exige_verificacion();

-- ---------- Cola de verificacion ----------

create or replace function public.admin_verificaciones(
  filtro_estado text default 'pendiente_revision',
  pagina int default 0, por_pagina int default 25
)
returns table (
  id uuid, user_id uuid, handle text, nombre text, email text,
  estado text, similitud numeric, paso_fallido text, motivo text,
  edad int, fecha_nacimiento date,
  ine_path text, selfie_path text, borrar_despues_de timestamptz,
  revisada_por uuid, revisada_at timestamptz, nota_revision text,
  created_at timestamptz,
  identidad_verificada boolean, intentos int,
  tiene_expediente boolean, clips_pendientes int, total_filas bigint
)
language sql security definer stable set search_path = '' as $$
  with base as (
    select v.id, v.user_id, p.handle, p.display_name as nombre, u.email::text,
           v.estado::text as estado, v.similitud, v.paso_fallido, v.motivo,
           v.edad, v.fecha_nacimiento,
           v.ine_path, v.selfie_path, v.borrar_despues_de,
           v.revisada_por, v.revisada_at, v.nota_revision, v.created_at,
           p.identidad_verificada,
           (select count(*)::int from public.intentos_verificacion i where i.user_id = v.user_id),
           exists (select 1 from public.expedientes e where e.user_id = v.user_id),
           (select count(*)::int from public.clips c
             where c.creator_id = v.user_id and c.estado = 'pendiente')
      from public.verificaciones v
      join public.profiles p on p.id = v.user_id
      join auth.users u on u.id = v.user_id
     where public.es_admin()
       and (filtro_estado = '' or v.estado::text = filtro_estado)
  )
  select b.*, count(*) over () from base b
   order by b.created_at asc
   limit  greatest(1, least(por_pagina, 100))
  offset greatest(0, pagina) * greatest(1, least(por_pagina, 100));
$$;
revoke all on function public.admin_verificaciones(text,int,int) from public, anon;
grant execute on function public.admin_verificaciones(text,int,int) to authenticated;

create or replace function public.admin_conteo_verificaciones()
returns table (estado text, cuantos bigint)
language sql security definer stable set search_path = '' as $$
  select v.estado::text, count(*) from public.verificaciones v
   where public.es_admin() group by v.estado;
$$;
revoke all on function public.admin_conteo_verificaciones() from public, anon;
grant execute on function public.admin_conteo_verificaciones() to authenticated;

comment on table public.verificaciones is
  'Solicitudes de verificacion. Las imagenes viven en un bucket privado que solo lee la administracion, y borrar_despues_de marca cuando dejan de conservarse: de la persona solo queda el booleano y la fecha.';
