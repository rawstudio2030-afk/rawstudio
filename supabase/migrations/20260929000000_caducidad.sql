-- Fecha de caducidad de una publicacion.
--
-- La creadora decide hasta cuando vive lo que sube. Es control sobre su propio
-- contenido, que en esta plataforma no es un lujo.
--
-- LA DECISION DE FONDO: que pasa con quien ya lo compro. La plataforma vende
-- "compra permanente"; cortarle el acceso a quien pago es quitarle lo que
-- compro. Por eso hay dos modos y la creadora elige con la consecuencia a la
-- vista:
--
--   'deja_de_venderse' (por omision) — desaparece del catalogo y nadie mas
--      puede comprarlo ni rentarlo. Quien ya lo compro conserva su acceso,
--      porque eso fue lo que se le vendio.
--
--   'retiro_total' — deja de verse para TODO EL MUNDO, incluida quien pago.
--      Es lo que hace falta cuando el motivo es la privacidad y no el negocio,
--      y por eso existe; pero genera derecho a reembolso y la pantalla lo dice.
--
-- SE APLICA AL LEER, no con una tarea programada. pg_cron no esta instalado, y
-- aunque lo estuviera, una caducidad que depende de que un proceso haya
-- corrido deja una ventana en la que el contenido sigue visible despues de la
-- fecha. Comprobarlo en la consulta no tiene ventana.

do $$ begin
  create type public.modo_caducidad as enum ('deja_de_venderse','retiro_total');
exception when duplicate_object then null; end $$;

alter table public.clips
  add column if not exists caduca_at   timestamptz,
  add column if not exists caduca_modo public.modo_caducidad not null default 'deja_de_venderse';

create index if not exists clips_caduca_idx on public.clips (caduca_at)
  where caduca_at is not null;

comment on column public.clips.caduca_at is
  'Cuando deja de publicarse. Se comprueba AL LEER y no con una tarea programada: una caducidad que depende de que un proceso haya corrido deja una ventana en la que el contenido sigue visible despues de la fecha.';

-- ---------- Vigencia ----------

create or replace function public.clip_vigente(c public.clips)
returns boolean language sql immutable set search_path = '' as $$
  select c.caduca_at is null or c.caduca_at > now();
$$;

create or replace function public.tiene_acceso(clip uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
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
                     where c2.id = clip and c2.borrado_at is null));
$$;

-- ---------- No se compra ni se renta lo caducado ----------

create or replace function public.comprable(clip uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clips c
                  where c.id = clip and c.published and c.borrado_at is null
                    and (c.caduca_at is null or c.caduca_at > now()));
$$;

-- ---------- La creadora la pone y la quita ----------

create or replace function public.fijar_caducidad(
  clip uuid, cuando timestamptz, modo public.modo_caducidad default 'deja_de_venderse'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  select creator_id into duenia from public.clips where id = clip;
  if duenia is null then raise exception 'Ese clip no existe'; end if;
  if duenia <> auth.uid() and not public.es_admin() then
    raise exception 'Ese clip no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  if cuando is not null and cuando <= now() then
    raise exception 'La fecha tiene que ser futura. Para quitarlo ahora mismo, borralo.';
  end if;

  update public.clips set caduca_at = cuando,
         caduca_modo = coalesce(modo, 'deja_de_venderse')
   where id = clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'fijar_caducidad', duenia,
          jsonb_build_object('clip', clip, 'caduca_at', cuando, 'modo', modo));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.fijar_caducidad(uuid, timestamptz, public.modo_caducidad) from public, anon;
revoke all on function public.comprable(uuid) from public, anon;
grant execute on function public.fijar_caducidad(uuid, timestamptz, public.modo_caducidad) to authenticated;
grant execute on function public.comprable(uuid) to authenticated, anon;
