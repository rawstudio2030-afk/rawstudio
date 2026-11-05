-- Avisarle A ELLA como va su verificacion.
--
-- ---------- El silencio ----------
--
-- Hoy la verificacion solo avisa hacia un lado. Quien administra recibe
-- «alguien mando su identificacion»; ella no recibe nada: ni que llego, ni
-- cuando se resolvio, ni por que se rechazo. La pantalla le dice «lo estamos
-- revisando a mano» y ahi se acaba.
--
-- Y es el peor momento para dejarla sin noticias, porque `clips_insert_propio`
-- exige la identidad verificada: mientras no se resuelva NO PUEDE SUBIR NADA.
-- Se registro, se hizo creadora, mando su INE, y esta mirando una pantalla
-- que no avanza sin saber si alguien la vio.
--
-- El patron ya existia y solo faltaba aplicarlo aqui: en los retiros estan los
-- dos lados —`avisar-retiro` a administracion, `avisar-creadora` a ella—. Esto
-- es la otra mitad de la verificacion, copiando esa forma.

alter table public.verificaciones
  add column if not exists avisada_estado public.estado_verificacion;

comment on column public.verificaciones.avisada_estado is
  'De que estado se le aviso A ELLA por correo. Null = de ninguno. Lo escribe la funcion de borde `avisar-verificada`. Se le avisa cuando `estado` ya no coincide con esto.';

-- ---------- Que hay que avisarle ----------

create or replace function public.verificacion_para_avisar_creadora()
returns jsonb
language sql security definer stable set search_path = '' as $$
  with pendientes as (
    select v.id, v.estado, v.motivo, v.created_at, v.revisada_at,
           coalesce(p.display_name, p.handle, '') as quien,
           u.email
      from public.verificaciones v
      join public.profiles p on p.id = v.user_id
      left join auth.users u on u.id = v.user_id
     -- 'procesando' no se avisa: es el estado con el que nace una revision
     -- automatica y dura segundos. Un correo ahi seria ruido justo antes del
     -- que si importa.
     where v.estado <> 'procesando'
       and (v.avisada_estado is null or v.avisada_estado <> v.estado)
  )
  select jsonb_build_object(
    'avisos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', id, 'estado', estado::text, 'quien', quien,
               'correo', email, 'motivo', motivo,
               'pedida_at', created_at, 'resuelta_at', revisada_at
             ) order by created_at), '[]'::jsonb)
        from pendientes where email is not null),

    -- Las que no se pueden avisar nunca porque no hay direccion. Se cuentan
    -- aparte en vez de devolverlas: si viajaran en la lista, cada pasada
    -- fallaria y el trabajo quedaria en rojo para siempre por algo que no se
    -- arregla reintentando.
    'sin_correo', (select count(*) from pendientes where email is null)
  );
$$;

comment on function public.verificacion_para_avisar_creadora is
  'Las verificaciones de las que todavia no se le ha avisado a ella, con su correo. Solo para la funcion de borde `avisar-verificada`: devuelve correos, que son datos personales.';

-- ---------- Darlas por avisadas ----------

create or replace function public.marcar_verificada_avisada(avisos jsonb)
returns int
language sql security definer set search_path = '' as $$
  with dichos as (
    select (a->>'id')::uuid as id,
           (a->>'estado')::public.estado_verificacion as estado
      from jsonb_array_elements(coalesce(avisos, '[]'::jsonb)) a
  ),
  tocadas as (
    update public.verificaciones v
       set avisada_estado = d.estado
      from dichos d
     where v.id = d.id
       -- Solo si SIGUE en el estado del que se aviso.
       --
       -- La hermana de los retiros compara el enum con `<` para no retroceder,
       -- y aqui eso estaria MAL: `estado_verificacion` se declaro
       -- (procesando, aprobada, rechazada, pendiente_revision) porque el
       -- ultimo se agrego despues, asi que 'pendiente_revision' es el mayor de
       -- los cuatro y con `<` nunca se avisaria de la aprobacion posterior.
       --
       -- Comparar contra el estado actual no depende de ningun orden: si entre
       -- leer y escribir la fila avanzo, no se marca, y la siguiente pasada
       -- avisa del estado nuevo.
       and v.estado = d.estado
       and (v.avisada_estado is null or v.avisada_estado <> d.estado)
    returning 1)
  select count(*)::int from tocadas;
$$;

comment on function public.marcar_verificada_avisada is
  'Marca de que estado se le aviso a ella. Se llama DESPUES de que Resend acepte el correo: si falla el envio, la fila sigue sin avisar y la siguiente pasada la recoge.';

revoke all on function public.verificacion_para_avisar_creadora() from public, anon, authenticated;
revoke all on function public.marcar_verificada_avisada(jsonb) from public, anon, authenticated;
grant execute on function public.verificacion_para_avisar_creadora() to service_role;
grant execute on function public.marcar_verificada_avisada(jsonb) to service_role;

-- ---------- Al instante, no en la siguiente pasada ----------

create or replace function public.tr_verificacion_avisa_creadora()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-verificada');
  return null;
end; $$;

drop trigger if exists verificacion_avisa_creadora on public.verificaciones;
create trigger verificacion_avisa_creadora
  after insert or update of estado on public.verificaciones
  for each row
  -- No dispara en 'procesando' ni cuando el estado no cambio. El update que
  -- escribe `avisada_estado` no entra aqui —el disparador mira `estado`—, asi
  -- que marcar como avisada no se avisa a si mismo.
  when (new.estado <> 'procesando')
  execute function public.tr_verificacion_avisa_creadora();

comment on function public.tr_verificacion_avisa_creadora is
  'Pide el correo hacia la creadora en cuanto su verificacion nace o cambia de estado, sin esperar a ninguna pasada. Nunca propaga un error: avisar no puede impedir resolver.';
