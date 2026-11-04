-- El aviso de purga, para quien no abre el panel.
--
-- El 3 de noviembre de 2026 se descubrio que el boton «Purgar» no se habia
-- pulsado nunca: un clip borrado el 28 de agosto, con fecha de purga el 27 de
-- septiembre, seguia con su portada descargable sin credenciales treinta y
-- siete dias despues. Al dia siguiente se le puso un contador al modulo
-- Contenido, y eso quito el «hay que acordarse de ir a ver» — pero no el «hay
-- que entrar». Si nadie abre el panel en dos meses, el contador no avisa a
-- nadie, que es exactamente lo que ya habia pasado.
--
-- Esto es el otro lado: que el aviso salga a buscar a la persona.
--
-- Lo que NO se hizo, y por que: automatizar la purga entera. Borrar los
-- archivos de verdad necesita la API de Storage, no SQL, y el orden importa
-- —archivos primero, rutas despues, o quedan huerfanos invisibles—. Una tarea
-- programada que lo hiciera mal borraria contenido sin nadie mirando. Avisar
-- es seguro; borrar solo, no.

create or replace function public.purga_pendiente()
returns jsonb
language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    'cuantos', (
      select count(*) from public.clips
       where borrado_at is not null
         and purgar_despues_de is not null
         and purgar_despues_de <= now()),
    -- Cuantos dias lleva esperando el mas viejo. Es el numero que dice si
    -- esto se esta acumulando o si es de esta semana.
    'dias_del_mas_viejo', (
      select coalesce(max(extract(day from now() - purgar_despues_de))::int, 0)
        from public.clips
       where borrado_at is not null
         and purgar_despues_de is not null
         and purgar_despues_de <= now()),
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

comment on function public.purga_pendiente is
  'Cuantos archivos borrados esperan purga, desde cuando, y a quien avisar. Solo para la funcion de borde `avisar-purga`: devuelve correos de administracion, que son datos personales.';

-- Nadie la ejecuta desde el navegador. La llama la funcion de borde con la
-- llave de servicio, que es la unica que debe ver estos correos; el panel ya
-- tiene `admin_por_purgar` para lo suyo y esa si esta pensada para la sesion
-- de quien administra.
revoke all on function public.purga_pendiente() from public, anon, authenticated;
grant execute on function public.purga_pendiente() to service_role;
