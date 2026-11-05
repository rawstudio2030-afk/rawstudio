-- Avisar a administracion cuando alguien manda su identificacion a revisar.
--
-- ---------- El agujero ----------
--
-- La pantalla de verificacion termina diciendo «Lo estamos revisando a mano»
-- y ahi se acaba todo. No habia ningun aviso: la unica forma de enterarse de
-- que hay una solicitud era abrir /#/admin/verificacion por casualidad.
--
-- Es el mismo caso que motivo el aviso de purga —el contador del panel solo
-- avisa a quien abre el panel— pero mas caro, porque esto no es
-- mantenimiento. `clips_insert_propio` exige `identidad_verificada`, asi que
-- mientras la solicitud no se resuelva esa persona NO PUEDE SUBIR NADA. Se
-- registro, se hizo creadora, mando su INE y su selfie, y se quedo mirando
-- una pantalla que no avanza.
--
-- Y hay un plazo prometido detras: `solicitar_verificacion_v2` pone
-- `borrar_despues_de = now() + 30 dias`. Conviene saber que esa fecha hoy no
-- la cumple nadie: ninguna tarea borra el bucket `verificacion` al llegar el
-- dia. Por eso el correo avisa de que el plazo se pasa, y no dice en ningun
-- sitio que las imagenes se hayan borrado.
--
-- ---------- Es una copia deliberada de `aviso_retiro` ----------
--
-- Misma forma: una columna `avisado_at`, una funcion que lee lo que falta por
-- avisar, otra que lo marca cuando Resend acepta, y un disparador que llama a
-- la funcion de borde por pg_net. Se copia en vez de generalizarse porque las
-- dos tablas no comparten ni columnas ni estados, y una abstraccion sobre dos
-- casos acaba siendo mas larga que los dos casos.
--
-- Lo que SI se comparte es lo unico que de verdad es comun:
-- `avisar_por_borde`, que no sabe nada de ninguna de las dos.
--
-- ---------- Lo que el correo NO lleva ----------
--
-- Ni la foto, ni la fecha de nacimiento, ni el hash del documento. Dice quien
-- y desde cuando espera, y manda al panel. Las imagenes viven en el bucket
-- privado `verificacion`, que solo lee `es_admin()`; mandarlas por correo las
-- sacaria de ahi para siempre y las dejaria de paso en los servidores de
-- Resend. Y no hacen falta para decidir si abrir el panel.

alter table public.verificaciones
  add column if not exists avisado_at timestamptz;

comment on column public.verificaciones.avisado_at is
  'Cuando se mando el correo de aviso de esta solicitud. Null = todavia no. Lo escribe la funcion de borde `avisar-verificacion`; sirve para avisar una sola vez por solicitud.';

-- ---------- Que hay que avisar ----------

create or replace function public.verificacion_pendiente()
returns jsonb
language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    -- Solo las que no se han avisado. Las demas ya salieron en un correo.
    'nuevas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', v.id,
               'quien', coalesce(p.display_name, p.handle, 'una cuenta sin nombre'),
               'handle', p.handle,
               'pedido_at', v.created_at,
               -- La fecha que se le PROMETIO: `solicitar_verificacion_v2`
               -- pone treinta dias. Va en el correo porque pasarse de ahi
               -- significa estar guardando datos biometricos mas tiempo del
               -- anunciado.
               --
               -- OJO: hoy no hay nada que borre el bucket `verificacion`
               -- cuando llega esa fecha. La columna se escribe y se enseña,
               -- y ahi se acaba. El correo esta redactado sabiendolo: habla
               -- del plazo prometido, nunca de un borrado que no ocurre.
               'borrar_despues_de', v.borrar_despues_de) order by v.created_at), '[]'::jsonb)
        from public.verificaciones v
        left join public.profiles p on p.id = v.user_id
       where v.estado = 'pendiente_revision' and v.avisado_at is null),

    -- Cuantas esperan en total, avisadas o no. «Esta es la cuarta que se
    -- acumula» es informacion distinta de «ha llegado una».
    'pendientes_total', (
      select count(*) from public.verificaciones
       where estado = 'pendiente_revision'),

    -- Desde cuando espera la mas vieja SIN RESOLVER, incluidas las ya
    -- avisadas. Es el numero que dice si esto se esta quedando parado.
    'espera_mas_vieja', (
      select min(created_at) from public.verificaciones
       where estado = 'pendiente_revision'),

    'admins', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'correo', u.email,
               'nombre', coalesce(p.display_name, p.handle, 'administración'))), '[]'::jsonb)
        from public.admins a
        join auth.users u on u.id = a.user_id
        left join public.profiles p on p.id = a.user_id
       where u.email is not null)
  );
$$;

comment on function public.verificacion_pendiente is
  'Las verificaciones en revision manual que todavia no se han avisado, mas el total pendiente y a quien avisar. Solo para la funcion de borde `avisar-verificacion`: devuelve correos de administracion, que son datos personales.';

-- ---------- Dar por avisadas ----------

create or replace function public.marcar_verificaciones_avisadas(ids uuid[])
returns int
language sql security definer set search_path = '' as $$
  with tocadas as (
    update public.verificaciones
       set avisado_at = now()
     where id = any(ids) and avisado_at is null
    returning 1)
  select count(*)::int from tocadas;
$$;

comment on function public.marcar_verificaciones_avisadas is
  'Marca como avisadas las verificaciones indicadas. Se llama DESPUES de que Resend acepte el correo, no antes: si falla el envio, la solicitud sigue sin avisar y el siguiente intento la recoge.';

-- Ninguna de las dos se llama desde el navegador. La de lectura devuelve
-- correos de administracion y la de escritura marca filas de una tabla que
-- `authenticated` no puede escribir.
revoke all on function public.verificacion_pendiente() from public, anon, authenticated;
revoke all on function public.marcar_verificaciones_avisadas(uuid[]) from public, anon, authenticated;
grant execute on function public.verificacion_pendiente() to service_role;
grant execute on function public.marcar_verificaciones_avisadas(uuid[]) to service_role;

-- ---------- El disparador ----------
--
-- Mismo patron que los dos de retiro: el trabajo de pg_net se encola DENTRO
-- de la transaccion, asi que la funcion de borde no puede leer una fila a
-- medio escribir, y si la insercion se deshace el aviso se va con ella.
--
-- `avisar_por_borde` se traga cualquier fallo suyo a proposito: avisar no
-- puede impedir que alguien mande su identificacion.

create or replace function public.tr_verificacion_pedida()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-verificacion');
  return null;
end; $$;

drop trigger if exists verificacion_pedida_avisa on public.verificaciones;
create trigger verificacion_pedida_avisa
  after insert on public.verificaciones
  for each row when (new.estado = 'pendiente_revision')
  execute function public.tr_verificacion_pedida();

-- La condicion `when` mira el estado porque el microservicio —el dia que
-- exista— insertara tambien filas 'procesando', 'aprobada' y 'rechazada', y
-- ninguna de esas tres necesita que nadie mire nada. Hoy todas entran como
-- 'pendiente_revision' porque la revision es manual, pero el disparador no
-- depende de que eso siga siendo cierto.
