-- Gestion de privilegios desde el panel.
--
-- public.admins no tiene politica de escritura a proposito, asi que estas dos
-- funciones son la UNICA via para mover el rol, y cada una comprueba es_admin()
-- antes de tocar nada. Se hace con funciones y no abriendo una politica porque
-- aqui hacen falta salvaguardas que una politica no puede expresar.

create or replace function public.admin_otorgar_admin(objetivo uuid, motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede otorgar privilegios'
      using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = objetivo) then
    raise exception 'Ese usuario no existe';
  end if;

  insert into public.admins (user_id, nota) values (objetivo, motivo)
  on conflict (user_id) do nothing;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'otorgar_admin', objetivo,
          jsonb_build_object('motivo', motivo));
end;
$$;

create or replace function public.admin_revocar_admin(objetivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cuantos int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede quitar privilegios'
      using errcode = 'insufficient_privilege';
  end if;

  -- Salvaguarda 1: nadie se quita el rol a si mismo. Un descuido dejaria la
  -- plataforma sin quien administre y sin forma de recuperarse desde la app.
  if objetivo = auth.uid() then
    raise exception 'No puedes quitarte a ti misma el rol de administradora';
  end if;

  -- Salvaguarda 2: siempre queda al menos una. Sin esto, dos administradoras
  -- podrian revocarse mutuamente y dejar el sistema huerfano.
  select count(*) into cuantos from public.admins;
  if cuantos <= 1 then
    raise exception 'Debe quedar al menos una administradora';
  end if;

  delete from public.admins where user_id = objetivo;

  insert into public.admin_log (admin_id, accion, objetivo)
  values (auth.uid(), 'revocar_admin', objetivo);
end;
$$;

-- Habilitar o quitar el perfil de creadora tambien es acto de administracion:
-- decide quien puede publicar.
create or replace function public.admin_marcar_creadora(objetivo uuid, valor boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar esto'
      using errcode = 'insufficient_privilege';
  end if;

  update public.profiles set is_creator = valor where id = objetivo;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), case when valor then 'habilitar_creadora' else 'quitar_creadora' end,
          objetivo, jsonb_build_object('valor', valor));
end;
$$;

revoke all on function public.admin_otorgar_admin(uuid, text)  from public, anon;
revoke all on function public.admin_revocar_admin(uuid)        from public, anon;
revoke all on function public.admin_marcar_creadora(uuid, boolean) from public, anon;
grant execute on function public.admin_otorgar_admin(uuid, text)  to authenticated;
grant execute on function public.admin_revocar_admin(uuid)        to authenticated;
grant execute on function public.admin_marcar_creadora(uuid, boolean) to authenticated;
