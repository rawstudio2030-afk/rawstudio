-- Avisos del administrador: lo que LLEGA a la plataforma, no solo cuantas cosas hay.
--
-- Las cuentas ya tienen un centro de avisos (`mis_avisos`, 20261129). El panel
-- solo tenia conteos (`admin_conteo_*`, `admin_atencion`): dicen cuantas hay,
-- pero si de 3 retiros se pasa a 4 nada senala cual es el nuevo, ni de quien, ni
-- desde cuando. Esto es lo mismo, con datos aparte:
--
--   - `admin_avisos()` ARMA la lista al pedirla, leyendo las mismas colas que ya
--     alimentan los badges (clips por moderar, identidades por revisar,
--     denuncias abiertas, retiros por aprobar o pagar, consultas por vencer o
--     vencidas, ajustes por firmar, archivos por purgar). NO hay tabla de
--     eventos que se acumule: un asunto resuelto en su modulo deja de salir
--     solo.
--   - Lo unico que se guarda es CUANDO cada administradora abrio la lista
--     (`avisos_estado_admin.visto_at`, una fila por administradora): que una la
--     abra no se la marca como vista a la otra.
--   - NO se mezcla con `mis_avisos`: lo personal y lo de la plataforma son
--     funciones distintas, y `mis_avisos` no cambia.
--
-- Misma forma de fila que `mis_avisos` (clave, tipo, titulo, detalle, ruta, at,
-- urgente, nuevo) para poder reutilizar la lista, pero con tipos propios de esta
-- cola. `urgente` = sigue pendiente y toca a alguien; se queda mientras no se
-- resuelva. `nuevo` = llego (o paso al estado notable) despues del ultimo
-- `visto_at` de ESTA administradora.
--
-- La campana del panel cuenta SOLO lo `nuevo`, no los pendientes: los badges del
-- menu ya cuentan los pendientes y decir lo mismo dos veces no informa.
--
-- Tope por tipo: con una cola grande (p. ej. cientos de clips por moderar) no se
-- listan todos uno por uno: se muestran los 25 mas recientes de cada tipo y una
-- fila «Y N mas» que lleva a la cola. Los badges siguen dando el total exacto.
--
-- Primera vez: una administradora que nunca ha abierto la lista ve como nuevo lo
-- que llego en las ultimas 24 horas, no todo el historial de pendientes.
--
-- PRIVACIDAD. Solo la ven administradoras (`es_admin()`); una cuenta normal recibe
-- un error. De las personas solo salen su nombre visible o usuario publico; nada
-- de contacto, ningun chat_id, ninguna imagen de verificacion.

create table public.avisos_estado_admin (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  visto_at timestamptz not null default 'epoch'
);
alter table public.avisos_estado_admin enable row level security;
revoke all on public.avisos_estado_admin from anon, authenticated;

-- El nombre de una persona para un aviso: su nombre visible, o su usuario si no
-- tiene; «Cuenta eliminada» si se anonimizo.
create or replace function public.aviso_admin_nombre(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when p.anonimizada_at is not null then 'Cuenta eliminada'
                 else coalesce(nullif(btrim(p.display_name), ''), '@' || p.handle) end
       from public.profiles p where p.id = uid),
    'Cuenta eliminada');
$$;
revoke all on function public.aviso_admin_nombre(uuid) from public, anon, authenticated;

create or replace function public.admin_avisos()
returns table (
  clave text, tipo text, titulo text, detalle text, ruta text,
  at timestamptz, urgente boolean, nuevo boolean
) language plpgsql stable security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  visto timestamptz;
  tope constant int := 25;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver estos avisos'
      using errcode = 'insufficient_privilege';
  end if;
  select e.visto_at into visto from public.avisos_estado_admin e where e.user_id = yo;
  if visto is null then visto := now() - interval '24 hours'; end if;

  return query
  with a (clave, tipo, titulo, detalle, ruta, at, urgente) as (

    -- Videos y albumes por moderar: los mismos de la cola (`admin_cola_moderacion`).
    select 'mo:' || c.id::text, 'moderacion',
           case when c.formato = 'album' then 'Álbum nuevo por moderar' else 'Video nuevo por moderar' end,
           '«' || c.title || '» de ' || public.aviso_admin_nombre(c.creator_id)
             || case when not coalesce(p.identidad_verificada, false) then ' · identidad sin verificar' else '' end,
           '/admin/moderacion', c.created_at, true
      from public.clips c join public.profiles p on p.id = c.creator_id
     where c.estado = 'pendiente' and (c.formato = 'video' or c.completo)

    union all
    -- Identidades por revisar, nuevas o enviadas otra vez.
    select 'vf:' || v.id::text, 'verificacion',
           case when (select count(*) from public.intentos_verificacion i where i.user_id = v.user_id) > 1
                then 'Identidad enviada otra vez' else 'Identidad nueva por revisar' end,
           public.aviso_admin_nombre(v.user_id)
             || case when v.paso_fallido is not null then ' · la revisión automática falló en «' || v.paso_fallido || '»' else '' end,
           '/admin/verificacion', v.created_at, true
      from public.verificaciones v
     where v.estado::text = 'pendiente_revision'

    union all
    -- Denuncias abiertas.
    select 'dn:' || r.id::text, 'denuncia',
           case r.estado::text when 'nuevo' then 'Denuncia nueva' else 'Denuncia en revisión' end,
           'De ' || public.aviso_admin_nombre(r.reporta_id) || ' · ' || replace(r.motivo::text, '_', ' ')
             || case when r.clip_id is not null
                     then ' · video «' || coalesce((select c.title from public.clips c where c.id = r.clip_id), '—') || '»'
                     when r.perfil_id is not null
                     then ' · perfil de ' || public.aviso_admin_nombre(r.perfil_id) else '' end,
           '/admin/reportes', r.created_at, true
      from public.reportes r
     where r.estado::text in ('nuevo', 'en_revision')

    union all
    -- Retiros por aprobar y por pagar.
    select 'rt:' || s.id::text, 'retiro',
           case s.estado::text when 'pendiente' then 'Retiro por aprobar' else 'Retiro aprobado por pagar' end,
           public.aviso_admin_nombre(s.creator_id) || ' pide $' || to_char(s.coins / 100.0, 'FM999,999,990.00'),
           '/admin/retiros',
           case s.estado::text when 'pendiente' then s.created_at else coalesce(s.resuelta_at, s.created_at) end,
           true
      from public.solicitudes_retiro s
     where s.estado::text in ('pendiente', 'aprobada')

    union all
    -- Consultas por Telegram a punto de vencer (menos de 12 h; el mismo umbral del Resumen).
    select 'cp:' || m.id::text, 'consulta',
           'Consulta por vencer sin respuesta',
           public.aviso_admin_nombre(q.creadora_id) || ' no ha respondido a ' || public.aviso_admin_nombre(q.cliente_id)
             || ' sobre «' || c.title || '». Escrito el '
             || to_char(m.created_at at time zone 'America/Mexico_City', 'DD/MM HH24:MI')
             || ', vence el ' || to_char(m.vence_at at time zone 'America/Mexico_City', 'DD/MM HH24:MI') || '.',
           '/admin/consultas?abrir=' || q.id::text,
           -- Pasa a ser notable al entrar en la ventana de 12 h, no al escribirse.
           m.vence_at - interval '12 hours', true
      from public.consulta_mensajes m
      join public.consultas q on q.id = m.consulta_id
      join public.clips c on c.id = q.clip_id
     where m.de = 'cliente' and m.estado = 'enviado'
       and m.vence_at >= now() and m.vence_at < now() + interval '12 hours'

    union all
    -- Consultas que vencieron sin respuesta (ya se devolvio el saldo): informativo.
    select 'cv:' || m.id::text, 'consulta',
           'Consulta vencida sin respuesta',
           public.aviso_admin_nombre(q.creadora_id) || ' no respondió a ' || public.aviso_admin_nombre(q.cliente_id)
             || ' sobre «' || c.title || '» a tiempo.',
           '/admin/consultas?abrir=' || q.id::text, m.vence_at, false
      from public.consulta_mensajes m
      join public.consultas q on q.id = m.consulta_id
      join public.clips c on c.id = q.clip_id
     where m.de = 'cliente' and m.estado = 'vencido'
       and m.vence_at > now() - interval '30 days'

    union all
    -- Abonos, ajustes y reembolsos que pasaron del tope y esperan la segunda firma.
    select 'aj:' || x.id::text, 'ajuste',
           case x.tipo when 'reembolso' then 'Reembolso por firmar' else 'Ajuste de saldo por firmar' end,
           case when x.propuesto_por = yo then 'Lo propusiste tú' else public.aviso_admin_nombre(x.propuesto_por) || ' lo propuso' end
             || ': $' || to_char(x.cantidad / 100.0, 'FM999,999,990.00') || ' para '
             || public.aviso_admin_nombre(x.objetivo) || ' · «' || x.motivo || '»',
           '/admin/retiros', x.propuesto_at, true
      from public.ajustes_pendientes x
     where x.estado = 'pendiente'

    union all
    -- Archivos que ya pasaron su fecha de purga y esperan a que alguien pulse «Purgar».
    select 'pg:' || c.id::text, 'purga',
           'Archivos vencidos por purgar',
           '«' || c.title || '» de ' || public.aviso_admin_nombre(c.creator_id)
             || ', vencido desde el ' || to_char(c.purgar_despues_de at time zone 'America/Mexico_City', 'DD/MM/YYYY') || '.',
           '/admin/contenido', c.purgar_despues_de, true
      from public.clips c
     where c.borrado_at is not null and c.purgar_despues_de is not null and c.purgar_despues_de <= now()
  ),
  ranked as (
    select a.*, row_number() over (partition by a.tipo order by a.at desc) as rn,
           count(*) over (partition by a.tipo) as total_tipo
      from a
  ),
  visibles as (
    select r.clave, r.tipo, r.titulo, r.detalle, r.ruta, r.at, r.urgente
      from ranked r where r.rn <= tope
    union all
    -- «Y N mas»: lo que no cupo, para que nadie crea que la cola termina ahi.
    select 'mas:' || r.tipo, r.tipo,
           'Y ' || (max(r.total_tipo) - tope) || ' más esperando',
           'Hay más pendientes de este tipo de los que caben aquí. Ábrelos en su módulo.',
           max(r.ruta), max(r.at), true
      from ranked r where r.rn > tope
     group by r.tipo
  )
  select v.clave, v.tipo, v.titulo, v.detalle, v.ruta, v.at, v.urgente, (v.at > visto)
    from visibles v
   order by v.urgente desc, v.at desc;
end; $$;
revoke all on function public.admin_avisos() from public, anon;
grant execute on function public.admin_avisos() to authenticated;

comment on function public.admin_avisos is
  'Lista de avisos de la plataforma para administracion, armada al pedirla desde las colas reales. `nuevo` = llego despues del ultimo visto_at de esta administradora. No es mis_avisos.';

-- «Ya vi los avisos del panel»: lo nuevo deja de contar para ESTA administradora;
-- lo pendiente sigue en la lista hasta que se resuelva en su modulo.
create or replace function public.admin_avisos_marcar_vistos()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede marcar estos avisos'
      using errcode = 'insufficient_privilege';
  end if;
  insert into public.avisos_estado_admin (user_id, visto_at) values (auth.uid(), now())
  on conflict (user_id) do update set visto_at = now();
end; $$;
revoke all on function public.admin_avisos_marcar_vistos() from public, anon;
grant execute on function public.admin_avisos_marcar_vistos() to authenticated;
