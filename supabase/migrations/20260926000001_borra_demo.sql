-- Borra los 567 perfiles de demostracion para arrancar solo con lo real.
--
-- Se borra de auth.users: el usuario arrastra por cascada su perfil, sus
-- niveles de suscripcion y sus clips, asi que no quedan huerfanos. Los eventos
-- que dejaron en la bitacora se conservan, ya sin apuntar a la fila borrada.
--
-- Es lo mismo que hace admin_borrar_demo(), que no se puede llamar desde aqui
-- porque comprueba es_admin() y en una migracion no hay sesion. Queda anotado
-- a nombre de la cuenta administradora con la via dicha en el detalle: un
-- borrado de 567 filas sin rastro seria justo lo que la bitacora evita.

do $$
declare antes int; despues int; adm uuid;
begin
  select count(*) into antes from public.profiles where es_demo;
  select user_id into adm from public.admins order by added_at limit 1;

  delete from auth.users u
   using public.profiles p
   where p.id = u.id and p.es_demo;

  select count(*) into despues from public.profiles where es_demo;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (adm, 'borrar_demo', adm,
          jsonb_build_object('perfiles', antes, 'restantes', despues,
                             'via', 'migracion 20260926000001'));

  raise notice 'BORRADOS % perfiles, quedan %', antes, despues;
end $$;
