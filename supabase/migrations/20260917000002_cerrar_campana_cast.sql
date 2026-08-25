-- Arregla el cast del estado al cerrar una campaña.
-- Un CASE devuelve texto: sin el ::public.estado_campana, Postgres rechaza la
-- asignacion al enum. Es el mismo tropiezo de otras migraciones de este
-- proyecto y por eso queda escrito aqui.
create or replace function public.admin_cerrar_campana(campana uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ok int; mal int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cerrar campañas'
      using errcode = 'insufficient_privilege';
  end if;
  select count(*) filter (where d.ok), count(*) filter (where not d.ok)
    into ok, mal from public.campana_destinatarios d where d.campana_id = campana;

  update public.campanas
     set enviados = ok, fallidos = mal, terminada_at = now(),
         estado = (case when mal > 0 and ok = 0 then 'fallida'
                        else 'enviada' end)::public.estado_campana
   where id = campana;
  return jsonb_build_object('ok', true, 'enviados', ok, 'fallidos', mal);
end; $$;
revoke all on function public.admin_cerrar_campana(uuid) from public, anon;
grant execute on function public.admin_cerrar_campana(uuid) to authenticated;
