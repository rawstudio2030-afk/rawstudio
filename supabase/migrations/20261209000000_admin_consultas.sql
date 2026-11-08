-- Consola de administracion de las consultas por Telegram: SOLO LECTURA.
--
-- Lo mismo que `mis_consultas` y `consulta_mensajes_de` (la bandeja de cada
-- creadora), pero ampliado a todo el sitio y solo para administracion
-- (`es_admin()`): alguien tiene que poder ver si el servicio funciona (si las
-- creadoras responden, si hay mensajes que vencen sin contestar) sin entrar a
-- Telegram.
--
-- PRIVACIDAD. Las tres funciones son `security definer`, solo las ejecuta un
-- administrador y NUNCA devuelven `chat_id`, telefono, token del bot ni ningun
-- dato de contacto: de cada parte solo el usuario publico de la app (o nulo si
-- la cuenta se anonimizo). Ver `20261128000000_bandeja_consultas.sql`.
--
-- SOLO LECTURA. Nada aqui escribe, cobra, reembolsa ni cambia el estado de un
-- mensaje. Las respuestas se siguen escribiendo en Telegram.
--
-- NO HAY «AVISOS DE VALIDACION» GUARDADOS. El bot valida un mensaje (minimo de
-- palabras, pertinencia, que la respuesta avance algo) ANTES de registrarlo; si no
-- cumple, no se guarda. Aqui solo aparece lo que SI se envio.
--
-- «Vencido» = un mensaje del cliente sin responder cuyo plazo ya paso, este o no
-- ya marcado por el bot (el bot lo marca y avisa al recibir cualquier mensaje).

create or replace function public.admin_consultas(
  p_filtro text default 'todas', p_busqueda text default '',
  p_pagina integer default 0, p_por_pagina integer default 25
) returns table (
  id uuid, creadora_handle text, otra_handle text,
  clip_id uuid, clip_titulo text,
  ultimo_at timestamptz, ultimo_de text, ultimo_texto text,
  mensajes integer, sin_responder integer, vencen_at timestamptz, vencidos integer,
  total_filas bigint
) language plpgsql stable security definer set search_path = '' as $$
declare lim int := greatest(1, least(coalesce(p_por_pagina, 25), 100));
        off_ int := greatest(0, coalesce(p_pagina, 0)) * lim;
        b text := '%' || lower(btrim(coalesce(p_busqueda, ''))) || '%';
begin
  if not public.es_admin() then return; end if;
  return query
    with base as (
      select q.id,
             case when pc.anonimizada_at is null then pc.handle else null end as creadora_handle,
             case when po.anonimizada_at is null then po.handle else null end as otra_handle,
             q.clip_id, c.title as clip_titulo, q.ultimo_at,
             (select m.de from public.consulta_mensajes m where m.consulta_id = q.id
               order by m.created_at desc limit 1) as ultimo_de,
             (select left(m.cuerpo, 160) from public.consulta_mensajes m where m.consulta_id = q.id
               order by m.created_at desc limit 1) as ultimo_texto,
             (select count(*)::int from public.consulta_mensajes m where m.consulta_id = q.id) as mensajes,
             (select count(*)::int from public.consulta_mensajes m
               where m.consulta_id = q.id and m.de = 'cliente' and m.estado = 'enviado'
                 and m.vence_at >= now()) as sin_responder,
             (select min(m.vence_at) from public.consulta_mensajes m
               where m.consulta_id = q.id and m.de = 'cliente' and m.estado = 'enviado'
                 and m.vence_at >= now()) as vencen_at,
             (select count(*)::int from public.consulta_mensajes m
               where m.consulta_id = q.id and m.de = 'cliente'
                 and (m.estado = 'vencido' or (m.estado = 'enviado' and m.vence_at < now()))) as vencidos
        from public.consultas q
        join public.clips c on c.id = q.clip_id
        join public.profiles pc on pc.id = q.creadora_id
        join public.profiles po on po.id = q.cliente_id
       where exists (select 1 from public.consulta_mensajes m where m.consulta_id = q.id)
    )
    select x.*, count(*) over () as total_filas
      from base x
     where (p_filtro not in ('esperando', 'vencidas')
            or (p_filtro = 'esperando' and x.sin_responder > 0)
            or (p_filtro = 'vencidas' and x.vencidos > 0))
       and (btrim(coalesce(p_busqueda, '')) = ''
            or lower(coalesce(x.creadora_handle, '')) like b
            or lower(coalesce(x.otra_handle, '')) like b
            or lower(x.clip_titulo) like b)
     order by x.ultimo_at desc
     limit lim offset off_;
end; $$;
revoke all on function public.admin_consultas(text, text, integer, integer) from public, anon;
grant execute on function public.admin_consultas(text, text, integer, integer) to authenticated;

create or replace function public.admin_consulta_mensajes(p_consulta uuid)
returns table (
  id uuid, de text, cuerpo text, palabras integer, created_at timestamptz,
  estado text, vence_at timestamptz, respondido_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then return; end if;
  return query
    select m.id, m.de, m.cuerpo, m.palabras, m.created_at,
           case when m.estado = 'enviado' and m.vence_at < now() then 'vencido' else m.estado end,
           m.vence_at, m.respondido_at
      from public.consulta_mensajes m
     where m.consulta_id = p_consulta
     order by m.created_at, m.de
     limit 500;
end; $$;
revoke all on function public.admin_consulta_mensajes(uuid) from public, anon;
grant execute on function public.admin_consulta_mensajes(uuid) to authenticated;

-- Para el aviso del menu y la tarjeta del Resumen. `esperando` son mensajes que
-- esperan respuesta dentro de su plazo; `vencidas`, los que vencieron en los
-- ULTIMOS 30 DIAS (de otro modo el numero solo creceria y nunca llegaria a cero).
create or replace function public.admin_conteo_consultas()
returns table (esperando bigint, vencidas bigint)
language sql stable security definer set search_path = '' as $$
  select count(*) filter (where m.estado = 'enviado' and m.vence_at >= now()),
         count(*) filter (where (m.estado = 'vencido' or (m.estado = 'enviado' and m.vence_at < now()))
                            and m.vence_at >= now() - interval '30 days')
    from public.consulta_mensajes m
   where public.es_admin() and m.de = 'cliente';
$$;
revoke all on function public.admin_conteo_consultas() from public, anon;
grant execute on function public.admin_conteo_consultas() to authenticated;
