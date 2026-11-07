-- Bandeja de consultas por Telegram: ver las conversaciones desde el sitio.
--
-- Solo LECTURA. Los mensajes se siguen escribiendo en Telegram, a traves del
-- bot, que es quien valida las reglas (minimo de palabras, pertinencia, que la
-- respuesta avance algo). Aqui cada parte ve SUS conversaciones y nada mas:
-- ninguna de las dos funciones devuelve el `chat_id` ni datos de contacto, y
-- de la otra parte solo se ve su usuario publico (o «Cuenta eliminada»).
--
-- Un mensaje «sin responder» es uno del cliente en estado `enviado`. Pasado su
-- plazo se muestra como vencido aunque el bot todavia no lo haya marcado (el
-- bot lo marca y avisa al recibir cualquier mensaje); aqui solo se lee, no se
-- cambia nada.

create or replace function public.mis_consultas()
returns table (
  id uuid, soy_creadora boolean, otra_handle text, otra_avatar text,
  clip_id uuid, clip_titulo text,
  ultimo_at timestamptz, ultimo_de text, ultimo_texto text,
  sin_responder integer, vencen_at timestamptz, vencidos integer
) language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'Entra para ver tus consultas' using errcode = 'insufficient_privilege';
  end if;
  return query
    select q.id,
           (q.creadora_id = yo),
           case when po.anonimizada_at is null then po.handle else null end,
           case when po.anonimizada_at is null then po.avatar_path else null end,
           q.clip_id, c.title,
           q.ultimo_at,
           (select m.de from public.consulta_mensajes m where m.consulta_id = q.id
             order by m.created_at desc limit 1),
           (select left(m.cuerpo, 160) from public.consulta_mensajes m where m.consulta_id = q.id
             order by m.created_at desc limit 1),
           (select count(*)::int from public.consulta_mensajes m
             where m.consulta_id = q.id and m.de = 'cliente' and m.estado = 'enviado'
               and m.vence_at >= now()),
           (select min(m.vence_at) from public.consulta_mensajes m
             where m.consulta_id = q.id and m.de = 'cliente' and m.estado = 'enviado'
               and m.vence_at >= now()),
           (select count(*)::int from public.consulta_mensajes m
             where m.consulta_id = q.id and m.de = 'cliente'
               and (m.estado = 'vencido' or (m.estado = 'enviado' and m.vence_at < now())))
      from public.consultas q
      join public.clips c on c.id = q.clip_id
      join public.profiles po on po.id = case when q.creadora_id = yo then q.cliente_id else q.creadora_id end
     where yo in (q.cliente_id, q.creadora_id)
       and exists (select 1 from public.consulta_mensajes m where m.consulta_id = q.id)
     order by q.ultimo_at desc
     limit 50;
end; $$;
revoke all on function public.mis_consultas() from public, anon;
grant execute on function public.mis_consultas() to authenticated;

create or replace function public.consulta_mensajes_de(p_consulta uuid)
returns table (
  id uuid, de text, cuerpo text, created_at timestamptz,
  estado text, vence_at timestamptz, es_mio boolean
) language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := auth.uid(); q public.consultas;
begin
  if yo is null then
    raise exception 'Entra para ver tus consultas' using errcode = 'insufficient_privilege';
  end if;
  select * into q from public.consultas where consultas.id = p_consulta;
  if q.id is null or yo not in (q.cliente_id, q.creadora_id) then
    return;   -- ni existe ni es suya: se ve igual
  end if;
  return query
    select m.id, m.de, m.cuerpo, m.created_at,
           case when m.estado = 'enviado' and m.vence_at < now() then 'vencido' else m.estado end,
           m.vence_at,
           ((m.de = 'creadora') = (q.creadora_id = yo))
      from public.consulta_mensajes m
     where m.consulta_id = p_consulta
     order by m.created_at
     limit 200;
end; $$;
revoke all on function public.consulta_mensajes_de(uuid) from public, anon;
grant execute on function public.consulta_mensajes_de(uuid) to authenticated;
