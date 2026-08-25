-- Faltaba la version numerica de admin_ajustar_bandera: la que existe recibe
-- booleano y el valor del coin es un entero de centavos.
create or replace function public.admin_ajustar_bandera_num(p_clave text, p_valor int)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar ajustes'
      using errcode = 'insufficient_privilege';
  end if;
  if p_valor < 0 then raise exception 'El valor no puede ser negativo'; end if;
  update public.ajustes
     set valor = to_jsonb(p_valor), updated_at = now(), updated_by = auth.uid()
   where clave = p_clave;
  if not found then raise exception 'Ese ajuste no existe'; end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'cambiar_ajuste', auth.uid(),
          jsonb_build_object('clave', p_clave, 'valor', p_valor));
  return jsonb_build_object('ok', true, 'valor', p_valor);
end; $$;
revoke all on function public.admin_ajustar_bandera_num(text, int) from public, anon;
grant execute on function public.admin_ajustar_bandera_num(text, int) to authenticated;
