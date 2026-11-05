-- Que el aviso salga en el instante, no en la siguiente pasada del cron.
--
-- ---------- El problema medido ----------
--
-- El 5 de noviembre de 2026 se probo el circuito entero con dinero de
-- verdad. Se pidio un retiro a la 01:24 y se aprobo a la 01:25. El cron corre
-- al minuto 7 de cada dos horas, asi que la pasada anterior habia sido a las
-- 00:07 y la siguiente era a las 02:07: ningun correo salio hasta que alguien
-- llamo a la funcion a mano.
--
-- O sea que la espera entre que algo pasa y que el correo sale es de CERO A
-- DOS HORAS, segun donde caiga en el ciclo. Y hubo un efecto secundario que
-- lo ilustra mejor: como la solicitud se resolvio dentro de esa ventana, el
-- aviso de «alguien pidio un retiro» no llego nunca. Cuando el cron paso, ya
-- no habia nada pendiente que contar.
--
-- ---------- El cron NO se tira ----------
--
-- Se queda como red de seguridad. Son dos caminos independientes hacia el
-- mismo correo y ninguno duplica nada, porque `avisado_at` y
-- `avisada_estado` ya impiden el segundo envio. Si un dia pg_net falla o la
-- boveda se queda sin el secreto, el cron sigue avisando con retraso en vez
-- de no avisar.
--
-- Y hace falta precisamente porque el cron tiene tres defectos que el
-- disparador no tiene: la espera, que GitHub retrasa las tareas cuando hay
-- carga, y que las desactiva solas si el repositorio pasa 60 dias sin
-- actividad. El tercero es el peligroso: los avisos se apagarian solos sin
-- decirselo a nadie. Con el disparador, el camino principal vive en la base
-- de datos y no depende de GitHub para nada.
--
-- ---------- Por que el disparador no lleva datos ----------
--
-- Solo dice «ve a mirar». Las funciones de borde ya consultan la base por su
-- cuenta, asi que el aviso no transporta ni importes ni correos: no hay nada
-- que se pueda filtrar por ahi y no hay forma de que el mensaje y la fila se
-- contradigan.
--
-- ---------- Donde vive el secreto ----------
--
-- En la boveda (`vault`), cifrada, NO en una columna de texto y NO en este
-- archivo, que acaba en git. El valor se guarda desde fuera llamando a
-- `guardar_cron_secret`, que solo puede ejecutar `service_role`.

create extension if not exists pg_net;

-- ---------- Guardar y rotar el secreto ----------

create or replace function public.guardar_cron_secret(secreto text)
returns text language plpgsql security definer set search_path = '' as $$
declare existente uuid;
begin
  if coalesce(trim(secreto), '') = '' then
    raise exception 'El secreto no puede estar vacio';
  end if;

  select id into existente from vault.secrets where name = 'cron_secret';

  if existente is null then
    perform vault.create_secret(
      secreto, 'cron_secret',
      'El mismo CRON_SECRET que exigen las funciones de borde en la cabecera x-cron-secret. Lo usan los disparadores para pedir un aviso al instante. Rotarlo: cambiarlo en Supabase (Edge Functions -> Secrets), en GitHub (Actions secrets) y aqui, los tres a la vez.');
    return 'guardado';
  end if;

  perform vault.update_secret(existente, secreto);
  return 'actualizado';
end; $$;

comment on function public.guardar_cron_secret is
  'Guarda o rota el CRON_SECRET en la boveda. Existe para que el valor nunca viaje en una migracion —que acabaria en git— ni haya que pegarlo en el editor de SQL. Solo service_role.';

revoke all on function public.guardar_cron_secret(text) from public, anon, authenticated;
grant execute on function public.guardar_cron_secret(text) to service_role;

-- ---------- Pedir un aviso ----------

create or replace function public.avisar_por_borde(funcion text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  secreto text;
  -- La URL del proyecto es publica: viaja dentro del bundle del sitio y ya
  -- esta escrita en .github/workflows/aviso-retiro.yml.
  base constant text := 'https://ggyubhyobobizugeknen.supabase.co/functions/v1/';
begin
  select decrypted_secret into secreto
    from vault.decrypted_secrets where name = 'cron_secret';

  if secreto is null then
    -- Sin secreto no se puede llamar, pero esto NO puede tumbar la operacion
    -- que disparo el aviso. El cron recogera lo que quede sin avisar.
    raise warning 'avisar_por_borde(%): no hay cron_secret en la boveda; el aviso lo mandara el cron', funcion;
    return;
  end if;

  perform net.http_post(
    url := base || funcion,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secreto),
    timeout_milliseconds := 5000);

exception when others then
  -- LA REGLA QUE IMPORTA: avisar nunca puede impedir pagar. Si pg_net no
  -- esta, si la boveda falla, si la URL cambia: se anota y se sigue. Aprobar
  -- un retiro tiene que funcionar aunque el correo no salga, y para eso
  -- esta el cron detras.
  raise warning 'avisar_por_borde(%) fallo y se ignora: %', funcion, sqlerrm;
end; $$;

comment on function public.avisar_por_borde is
  'Pide a una funcion de borde que mande sus avisos, al instante, por pg_net. No lleva datos: solo dice «ve a mirar». Nunca propaga un error: avisar no puede impedir pagar.';

revoke all on function public.avisar_por_borde(text) from public, anon, authenticated;
-- A `service_role` si, por dos razones: para poder COMPROBAR que la cadena
-- entera funciona —boveda, pg_net, cabecera, funcion de borde— sin tener que
-- fingir un retiro, y para poder forzar los avisos a mano el dia que haga
-- falta. Los disparadores no necesitan este permiso: Postgres no comprueba
-- EXECUTE al disparar un trigger, solo al crearlo.
grant execute on function public.avisar_por_borde(text) to service_role;

-- ---------- Los dos disparadores ----------
--
-- El trabajo se encola DENTRO de la transaccion, asi que la peticion solo se
-- vuelve visible para el trabajador de pg_net cuando la transaccion ya ha
-- confirmado. La funcion de borde nunca puede leer una fila a medio escribir,
-- y si la transaccion se deshace el aviso desaparece con ella.

create or replace function public.tr_retiro_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-retiro');
  return null;
end; $$;

drop trigger if exists retiro_pedido_avisa on public.solicitudes_retiro;
create trigger retiro_pedido_avisa
  after insert on public.solicitudes_retiro
  for each row when (new.estado = 'pendiente')
  execute function public.tr_retiro_pedido();

create or replace function public.tr_retiro_resuelto()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-creadora');
  return null;
end; $$;

drop trigger if exists retiro_resuelto_avisa on public.solicitudes_retiro;
create trigger retiro_resuelto_avisa
  after update of estado on public.solicitudes_retiro
  for each row
  when (new.estado is distinct from old.estado and new.estado <> 'pendiente')
  execute function public.tr_retiro_resuelto();

-- Nota sobre `for each row` y no `for each statement`: si una misma
-- transaccion tocara dos solicitudes se pedirian dos avisos. Es inofensivo
-- —el segundo no encuentra nada nuevo que avisar— y a cambio la condicion
-- `when` puede mirar la fila, que es lo que evita llamar por un cambio que
-- no le interesa a nadie.
--
-- Y la purga no lleva disparador a proposito: su plazo es de treinta dias y
-- el aviso semanal le sobra.
