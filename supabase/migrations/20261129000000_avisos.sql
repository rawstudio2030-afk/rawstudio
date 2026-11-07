-- Centro de avisos: lo que le pasa a mi cuenta y lo que me toca hacer.
--
-- Hay muchas opciones y nada avisa: alguien te compra un video, te escribe una
-- consulta o te aprueban la identidad, y tienes que ir a adivinar donde mirar.
-- Esto junta todo en una lista, como la campana de Facebook.
--
-- DE DONDE SALE. No hay una tabla de notificaciones ni disparadores nuevos: la
-- lista se ARMA al pedirla, leyendo lo que ya existe (consultas, encargos,
-- compras, rentas, propinas, suscripciones, comentarios, verificacion, retiros y
-- clips). Asi nunca se desincroniza de la realidad: si el encargo ya se
-- resolvio, el aviso desaparece solo. Lo unico que se guarda es CUANDO abriste la
-- lista por ultima vez (`avisos_estado.visto_at`).
--
-- DOS CLASES DE AVISO
--   - `urgente`: te toca hacer algo (responder una consulta antes de que venza,
--     entregar un encargo pagado, pagar uno aceptado, volver a verificarte). Se
--     queda en la lista, y cuenta en la campana, mientras siga pendiente.
--   - el resto es informativo (te compraron, te comentaron, te pagaron un
--     retiro): cuenta como nuevo hasta que abres la lista.
--
-- PRIVACIDAD. Solo devuelve lo de la propia cuenta. De la otra parte solo sale
-- su usuario publico (o «Alguien» si la cuenta se anonimizo); ningun dato de
-- contacto, ningun chat_id, ninguna nota interna de administracion. Ventana de
-- 30 dias para lo informativo (14 para comentarios y respuestas).

create table public.avisos_estado (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  visto_at timestamptz not null default 'epoch'
);
alter table public.avisos_estado enable row level security;
revoke all on public.avisos_estado from anon, authenticated;

create or replace function public.aviso_quien(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select case when p.anonimizada_at is null then '@' || p.handle else 'Alguien' end
                     from public.profiles p where p.id = uid), 'Alguien');
$$;
revoke all on function public.aviso_quien(uuid) from public, anon, authenticated;

create or replace function public.mis_avisos()
returns table (
  clave text, tipo text, titulo text, detalle text, ruta text,
  at timestamptz, urgente boolean, nuevo boolean
) language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := auth.uid(); visto timestamptz;
begin
  if yo is null then
    raise exception 'Entra para ver tus avisos' using errcode = 'insufficient_privilege';
  end if;
  select coalesce((select e.visto_at from public.avisos_estado e where e.user_id = yo), 'epoch') into visto;

  return query
  with a (clave, tipo, titulo, detalle, ruta, at, urgente) as (

    -- Consultas por Telegram: alguien me escribio y no he respondido.
    select 'cq:' || m.id::text, 'consulta',
           public.aviso_quien(q.cliente_id) || ' te escribió',
           'Sobre «' || c.title || '». Respóndele por Telegram antes de que venza el plazo.',
           '/estudio', m.created_at, true
      from public.consulta_mensajes m
      join public.consultas q on q.id = m.consulta_id
      join public.clips c on c.id = q.clip_id
     where q.creadora_id = yo and m.de = 'cliente' and m.estado = 'enviado' and m.vence_at >= now()

    union all
    -- Consultas: la creadora respondio la mia.
    select 'cr:' || m.id::text, 'consulta',
           public.aviso_quien(q.creadora_id) || ' respondió tu consulta',
           'Sobre «' || c.title || '». Lee la respuesta en Telegram.',
           '/clip/' || c.id::text, m.created_at, false
      from public.consulta_mensajes m
      join public.consultas q on q.id = m.consulta_id
      join public.clips c on c.id = q.clip_id
     where q.cliente_id = yo and m.de = 'creadora' and m.created_at > now() - interval '14 days'

    union all
    -- Encargos donde soy la creadora.
    select 'ec:' || e.id::text, 'encargo',
           case e.estado::text
             when 'propuesta' then 'Nuevo encargo de ' || public.aviso_quien(e.fan_id)
             when 'negociando' then 'Encargo en negociación con ' || public.aviso_quien(e.fan_id)
             else public.aviso_quien(e.fan_id) || ' ya pagó su encargo' end,
           case e.estado::text
             when 'propuesta' then 'Te propone un trabajo a la medida. Acéptalo, negocia o recházalo.'
             when 'negociando' then 'Revisa la última propuesta.'
             else 'Entrégalo para recibir tu pago.' end,
           '/chat', e.updated_at,
           e.estado::text in ('propuesta', 'pagado', 'en_proceso')
      from public.custom_requests e
     where e.creator_id = yo and e.estado::text in ('propuesta', 'negociando', 'pagado', 'en_proceso')

    union all
    -- Encargos donde soy quien pidio.
    select 'ef:' || e.id::text, 'encargo',
           case e.estado::text
             when 'aceptado' then 'Tu encargo fue aceptado'
             when 'negociando' then 'Hay movimiento en tu encargo'
             when 'pagado' then 'Tu encargo está pagado'
             when 'en_proceso' then 'Tu encargo está en proceso'
             when 'entregado' then 'Tu encargo fue entregado'
             else 'Rechazaron tu encargo' end,
           case e.estado::text
             when 'aceptado' then 'Págalo para que ' || public.aviso_quien(e.creator_id) || ' lo empiece.'
             when 'negociando' then 'Revisa la propuesta de ' || public.aviso_quien(e.creator_id) || '.'
             when 'entregado' then 'Ya puedes verlo en tu Biblioteca.'
             when 'rechazado' then 'Puedes pedirle otra cosa o buscar a otra creadora.'
             else 'Te avisamos cuando se entregue.' end,
           '/chat', e.updated_at,
           e.estado::text = 'aceptado'
      from public.custom_requests e
     where e.fan_id = yo
       and (e.estado::text in ('negociando', 'aceptado', 'pagado', 'en_proceso')
            or (e.estado::text in ('entregado', 'rechazado') and e.updated_at > now() - interval '30 days'))

    union all
    -- Me compraron un video.
    select 'vc:' || p.id::text, 'venta',
           public.aviso_quien(p.user_id) || ' compró tu video', '«' || c.title || '»',
           '/clip/' || c.id::text, p.created_at, false
      from public.purchases p join public.clips c on c.id = p.clip_id
     where c.creator_id = yo and p.user_id <> yo and p.price_coins > 0
       and p.created_at > now() - interval '30 days'

    union all
    -- Me rentaron un video.
    select 'vr:' || r.id::text, 'venta',
           public.aviso_quien(r.user_id) || ' rentó tu video', '«' || c.title || '»',
           '/clip/' || c.id::text, r.created_at, false
      from public.rentals r join public.clips c on c.id = r.clip_id
     where c.creator_id = yo and r.user_id <> yo and r.created_at > now() - interval '30 days'

    union all
    -- Propinas.
    select 'vt:' || t.id::text, 'venta',
           public.aviso_quien(t.de_id) || ' te dio una propina',
           coalesce(nullif(left(t.mensaje, 120), ''), 'Gracias por tu contenido.'),
           '/wallet', t.created_at, false
      from public.tips t
     where t.para_id = yo and t.created_at > now() - interval '30 days'

    union all
    -- Suscripciones nuevas.
    select 'vs:' || s.id::text, 'venta',
           public.aviso_quien(s.subscriber_id) || ' se suscribió', 'Tu suscripción mensual tiene una persona más.',
           '/estudio', s.created_at, false
      from public.subscriptions s
     where s.creator_id = yo and s.estado::text = 'activa' and s.created_at > now() - interval '30 days'

    union all
    -- Comentarios en mis videos.
    select 'cm:' || cc.id::text, 'comentario',
           public.aviso_quien(cc.autora_id) || ' comentó tu video', left(cc.texto, 120),
           '/clip/' || c.id::text, cc.created_at, false
      from public.comentarios_clip cc join public.clips c on c.id = cc.clip_id
     where c.creator_id = yo and cc.autora_id <> yo and cc.borrado_at is null
       and cc.created_at > now() - interval '14 days'

    union all
    -- Verificacion de identidad.
    select 'vf:' || v.id::text, 'cuenta',
           case v.estado::text
             when 'aprobada' then 'Tu identidad fue aprobada'
             when 'rechazada' then 'Tu verificación fue rechazada'
             else 'Estamos revisando tu identidad' end,
           case v.estado::text
             when 'aprobada' then 'Ya puedes subir y publicar videos.'
             when 'rechazada' then 'Vuelve a intentarlo desde Verificar identidad.'
             else 'Te avisamos en cuanto se resuelva.' end,
           case v.estado::text when 'aprobada' then '/upload' else '/verificar' end,
           coalesce(v.revisada_at, v.created_at),
           v.estado::text = 'rechazada'
      from public.verificaciones v
     where v.user_id = yo and v.estado::text in ('aprobada', 'rechazada', 'pendiente_revision')
       and coalesce(v.revisada_at, v.created_at) > now() - interval '30 days'

    union all
    -- Retiros.
    select 'rt:' || s.id::text, 'dinero',
           case s.estado::text
             when 'pagada' then 'Tu retiro fue pagado'
             when 'rechazada' then 'Tu retiro fue rechazado'
             else 'Tu retiro está en proceso' end,
           case s.estado::text
             when 'pagada' then 'El dinero va en camino a tu cuenta.'
             when 'rechazada' then 'Revisa el motivo en Dinero.'
             else 'Lo estamos revisando.' end,
           '/wallet', coalesce(s.resuelta_at, s.created_at),
           s.estado::text = 'rechazada'
      from public.solicitudes_retiro s
     where s.creator_id = yo
       and (s.estado::text in ('pendiente', 'aprobada')
            or coalesce(s.resuelta_at, s.created_at) > now() - interval '30 days')

    union all
    -- Mis videos rechazados o retirados.
    select 'cl:' || c.id::text, 'cuenta',
           case c.estado::text when 'rechazado' then 'Rechazaron tu video' else 'Retiraron tu video' end,
           '«' || c.title || '»', '/clip/' || c.id::text, c.updated_at, true
      from public.clips c
     where c.creator_id = yo and c.estado::text in ('rechazado', 'retirado') and c.borrado_at is null
       and c.updated_at > now() - interval '30 days'

    union all
    -- Lo que compre: confirmacion y donde encontrarlo.
    select 'mc:' || p.id::text, 'compra',
           'Compraste «' || c.title || '»', 'Lo encuentras siempre en tu Biblioteca.',
           '/library', p.created_at, false
      from public.purchases p join public.clips c on c.id = p.clip_id
     where p.user_id = yo and p.price_coins > 0 and p.created_at > now() - interval '3 days'

    union all
    -- Una renta mia que esta por vencer.
    select 'mr:' || r.id::text, 'compra',
           'Tu renta de «' || c.title || '» vence pronto',
           'Termina ' || to_char(r.vence at time zone 'America/Mexico_City', 'DD/MM HH24:MI') || '.',
           '/clip/' || c.id::text, r.vence, true
      from public.rentals r join public.clips c on c.id = r.clip_id
     where r.user_id = yo and r.vence > now() and r.vence < now() + interval '24 hours'
  )
  select a.clave, a.tipo, a.titulo, a.detalle, a.ruta, a.at, a.urgente, (a.at > visto)
    from a
   order by a.urgente desc, a.at desc
   limit 40;
end; $$;
revoke all on function public.mis_avisos() from public, anon;
grant execute on function public.mis_avisos() to authenticated;

-- «Ya vi mis avisos»: lo nuevo deja de contar; lo urgente sigue mientras siga pendiente.
create or replace function public.avisos_marcar_vistos()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entra para continuar' using errcode = 'insufficient_privilege';
  end if;
  insert into public.avisos_estado (user_id, visto_at) values (auth.uid(), now())
  on conflict (user_id) do update set visto_at = now();
end; $$;
revoke all on function public.avisos_marcar_vistos() from public, anon;
grant execute on function public.avisos_marcar_vistos() to authenticated;
