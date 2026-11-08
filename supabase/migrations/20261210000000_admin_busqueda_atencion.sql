-- Panel de administracion: busqueda general y datos de urgencia.
--
-- Dos funciones de SOLO LECTURA, ambas `security definer`, solo `es_admin()`
-- (un no administrador recibe cero filas) y sin acceso para `anon`.
--
-- admin_buscar(texto)
--   Un solo viaje por busqueda: devuelve, ya agrupado, hasta 6 resultados de
--   cada grupo —personas, contenido, consultas—. Busca por handle, nombre y
--   correo (personas, igual que Usuarios), titulo o id de clip (contenido), y
--   handle de cualquiera de las dos partes o titulo del clip (consultas). Usa
--   `position()` y no `ilike`: el texto que escribe quien busca es literal, y un
--   «%» o un «_» no deben comportarse como comodines.
--
--   PRIVACIDAD. De una consulta solo salen los handles publicos (o nulo si la
--   cuenta se anonimizo: la pantalla pinta «Cuenta eliminada») y el titulo del
--   clip. Nunca chat_id, telefono, token ni el texto de los mensajes. El correo
--   de una persona ya lo muestra el panel de Usuarios al mismo administrador.
--
-- admin_atencion()
--   Una fila con lo que el Resumen necesita ademas de los conteos que ya existian
--   (`admin_conteo_*`): cuantas veces algo lleva esperando de mas, calculado con
--   FECHAS GUARDADAS, no adivinado.
--     * moderacion: clips pendientes (los mismos de la cola: un album a medio
--       subir no cuenta) que llevan mas de 24 horas desde `created_at`, y la fecha
--       del mas antiguo.
--     * consultas: mensajes del cliente aun dentro de plazo que vencen en menos de
--       12 horas, y la fecha del que vence primero. NO cambia la regla de negocio
--       del plazo (`consultas_config.plazo_horas`): solo mira cuanto le queda.
--     * avatares: creadoras (`is_creator`, no vetadas) sin foto (`avatar_path`
--       nulo) con al menos un clip PUBLICADO, con video y no borrado. Es el mismo
--       lote que busca «Buscar creadoras sin foto» en Herramientas. Una sin video
--       no cuenta: se queda con su inicial, sin propuesta que revisar. Esto solo
--       CUENTA: no genera ni publica ningun avatar.

create or replace function public.admin_buscar(p_q text)
returns table (grupo text, id uuid, titulo text, detalle text, estado text)
language plpgsql stable security definer set search_path = '' as $$
declare q text := lower(btrim(coalesce(p_q, '')));
begin
  if not public.es_admin() or char_length(q) < 2 then return; end if;
  return query
    (select 'personas'::text, p.id, '@' || p.handle,
            concat_ws(' · ', nullif(p.display_name, ''), u.email::text),
            public.estado_cuenta(p.id)::text
       from public.profiles p
       left join auth.users u on u.id = p.id
      where position(q in lower(p.handle)) > 0
         or position(q in lower(coalesce(p.display_name, ''))) > 0
         or position(q in lower(coalesce(u.email::text, ''))) > 0
         or p.id::text = q
      order by (lower(p.handle) = q) desc, p.handle
      limit 6)
    union all
    (select 'contenido'::text, c.id, c.title,
            '@' || cp.handle || ' · ' || case when c.formato = 'album' then 'álbum' else 'video' end,
            case when c.borrado_at is not null then 'borrado' else c.estado::text end
       from public.clips c
       join public.profiles cp on cp.id = c.creator_id
      where position(q in lower(c.title)) > 0 or left(c.id::text, char_length(q)) = q
      order by c.created_at desc
      limit 6)
    union all
    (select 'consultas'::text, k.id, c.title,
            coalesce('@' || case when pc.anonimizada_at is null then pc.handle end, 'Cuenta eliminada')
              || ' ↔ ' ||
            coalesce('@' || case when po.anonimizada_at is null then po.handle end, 'Cuenta eliminada'),
            null::text
       from public.consultas k
       join public.clips c on c.id = k.clip_id
       join public.profiles pc on pc.id = k.creadora_id
       join public.profiles po on po.id = k.cliente_id
      where exists (select 1 from public.consulta_mensajes m where m.consulta_id = k.id)
        and (position(q in lower(c.title)) > 0
             or (pc.anonimizada_at is null and position(q in lower(pc.handle)) > 0)
             or (po.anonimizada_at is null and position(q in lower(po.handle)) > 0))
      order by k.ultimo_at desc
      limit 6);
end; $$;
revoke all on function public.admin_buscar(text) from public, anon;
grant execute on function public.admin_buscar(text) to authenticated;

create or replace function public.admin_atencion()
returns table (
  mod_mas_de_24h bigint, mod_mas_antiguo timestamptz,
  cons_por_vencer bigint, cons_proximo_vence timestamptz,
  avatares_por_revisar bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then return; end if;
  return query
    select
      (select count(*) from public.clips c
        where c.estado = 'pendiente' and (c.formato = 'video' or c.completo)
          and c.created_at < now() - interval '24 hours'),
      (select min(c.created_at) from public.clips c
        where c.estado = 'pendiente' and (c.formato = 'video' or c.completo)),
      (select count(*) from public.consulta_mensajes m
        where m.de = 'cliente' and m.estado = 'enviado'
          and m.vence_at >= now() and m.vence_at < now() + interval '12 hours'),
      (select min(m.vence_at) from public.consulta_mensajes m
        where m.de = 'cliente' and m.estado = 'enviado'
          and m.vence_at >= now() and m.vence_at < now() + interval '12 hours'),
      (select count(*) from public.profiles p
        where p.is_creator and p.avatar_path is null and p.baneado_at is null
          and exists (select 1 from public.clips c
                       where c.creator_id = p.id and c.published and c.tiene_video
                         and c.borrado_at is null));
end; $$;
revoke all on function public.admin_atencion() from public, anon;
grant execute on function public.admin_atencion() to authenticated;
