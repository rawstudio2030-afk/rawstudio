-- Avatares: que la administracion pueda ponerlos y que dejen de cachearse.
--
-- DOS FALLOS DISTINTOS:
--
-- 1. Una creadora dada de alta por administracion no podia tener foto. El
--    asistente de alta no la pedia, y la politica del bucket solo deja
--    escribir en la carpeta propia: el admin no puede escribir en la de ella.
--    Como esas creadoras ni siquiera pueden entrar a su cuenta, la foto no
--    tenia ninguna via posible.
--
-- 2. La foto se subia siempre a la misma ruta ({id}/avatar.jpg) con upsert,
--    asi que la URL publica nunca cambiaba y el navegador y la CDN seguian
--    sirviendo la vieja durante horas. Eso se arregla del lado del cliente
--    usando una ruta nueva en cada subida; aqui va lo que hace falta en la
--    base para poder borrar la anterior.

create policy avatars_admin_sube on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create policy avatars_admin_actualiza on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create policy avatars_admin_borra on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and public.es_admin()
    and exists (select 1 from public.expedientes e
                where e.user_id::text = (storage.foldername(name))[1])
  );

create or replace function public.admin_fijar_avatar(creadora uuid, ruta text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar la foto de otra persona'
      using errcode = 'insufficient_privilege';
  end if;
  -- Solo de creadoras con expediente: el mismo limite que para publicar por
  -- ellas. Un admin no anda cambiandole la foto a cualquiera.
  if not exists (select 1 from public.expedientes e where e.user_id = creadora) then
    raise exception 'Esa persona no fue dada de alta por administracion';
  end if;

  update public.profiles set avatar_path = ruta, updated_at = now()
   where id = creadora;
  if not found then raise exception 'Ese perfil no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'fijar_avatar', creadora, jsonb_build_object('ruta', ruta));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_fijar_avatar(uuid, text) from public, anon;
grant execute on function public.admin_fijar_avatar(uuid, text) to authenticated;
