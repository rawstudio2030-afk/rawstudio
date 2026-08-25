-- Fijar la portada de un clip desde el panel.
--
-- Hace falta para los clips que se subieron antes de que la aplicacion sacara
-- el cuadro del video sola: se quedaron sin imagen y caian al patron generado.
create or replace function public.admin_fijar_portada(clip uuid, ruta text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar la portada'
      using errcode = 'insufficient_privilege';
  end if;
  update public.clips set cover_path = ruta where id = clip
  returning creator_id into duenia;
  if duenia is null then raise exception 'Ese clip no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'fijar_portada', duenia,
          jsonb_build_object('clip', clip, 'ruta', ruta));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_fijar_portada(uuid, text) from public, anon;
grant execute on function public.admin_fijar_portada(uuid, text) to authenticated;
