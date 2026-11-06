-- Consultas sobre otras cuentas.
--
-- Varias funciones reciben un id de usuario y contestaban para cualquiera, aun
-- con la llave publica: saldo, ganancias, saldo disponible para retirar,
-- estado de la cuenta, rol, si es administradora, si puede cobrar y si alguien
-- tiene acceso a un clip. Los ids de las cuentas se ven en el directorio.
--
-- - saldo, es_admin y tiene_acceso siguen abiertas a la app, pero solo
--   contestan sobre la propia cuenta o si quien llama es administradora. Las
--   llamadas del servidor sin sesion (SQL, cron, llave de servicio) no cambian.
-- - Las demas no las llama ninguna pantalla ni funcion de borde: solo otras
--   funciones del esquema, que corren con permisos propios. Se les quita el
--   permiso de ejecucion a la API.

-- Quien llama puede consultar a `uid`: es esa cuenta, es administradora, o es
-- el servidor (sin sesion o con llave de servicio).
create or replace function public.consulta_permitida(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
       uid = auth.uid()
    or auth.role() is null
    or auth.role() = 'service_role'
    or exists (select 1 from public.admins a where a.user_id = auth.uid()),
    false);
$$;
revoke all on function public.consulta_permitida(uuid) from public, anon, authenticated;

-- Falla en lugar de devolver vacio: un nulo se leeria como "no falta saldo".
create or replace function public.saldo(uid uuid default auth.uid())
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.consulta_permitida(uid) then
    raise exception 'No puedes consultar el saldo de otra cuenta'
      using errcode = 'insufficient_privilege';
  end if;
  return (select coalesce(sum(delta), 0)::int from public.coin_ledger where user_id = uid);
end; $$;
revoke all on function public.saldo(uuid) from public, anon;
grant execute on function public.saldo(uuid) to authenticated;

create or replace function public.es_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = uid)
     and public.consulta_permitida(uid);
$$;

revoke all on function public.total_ganado(uuid)     from public, anon, authenticated;
revoke all on function public.retiro_disponible(uuid) from public, anon, authenticated;
revoke all on function public.estado_cuenta(uuid)    from public, anon, authenticated;
revoke all on function public.puede_cobrar(uuid)     from public, anon, authenticated;
revoke all on function public.rol_de(uuid)           from public, anon, authenticated;

-- Quien no es la propia cuenta ni administradora no averigua las compras de
-- otra persona.

CREATE OR REPLACE FUNCTION public.tiene_acceso(clip uuid, uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.consulta_permitida(uid) and (exists (
    select 1 from public.clips c
    where c.id = clip
      and c.borrado_at is null
      -- Caducado con retiro total: no lo abre nadie, ni quien lo compro.
      and not (c.caduca_at is not null and c.caduca_at <= now()
               and c.caduca_modo = 'retiro_total')
      and (
         c.creator_id = uid                    -- lo suyo, aunque haya caducado
      or (c.published and c.visibility = 'gratis'
          and (c.caduca_at is null or c.caduca_at > now()))
      -- Quien lo compro o lo renta conserva el acceso al caducar: eso fue lo
      -- que se le vendio. Solo el retiro total, arriba, se lo quita.
      or exists (select 1 from public.purchases p
                 where p.clip_id = clip and p.user_id = uid)
      or exists (select 1 from public.rentals r
                 where r.clip_id = clip and r.user_id = uid and r.vence > now())
      or (c.visibility = 'suscriptores'
          and (c.caduca_at is null or c.caduca_at > now())
          and exists (
            select 1 from public.subscriptions s
            where s.creator_id = c.creator_id and s.subscriber_id = uid
              and s.estado = 'activa' and s.periodo_fin > now()))
      )
  ) or (public.es_admin(uid)
        and exists (select 1 from public.clips c2
                     where c2.id = clip and c2.borrado_at is null)));
$function$;
