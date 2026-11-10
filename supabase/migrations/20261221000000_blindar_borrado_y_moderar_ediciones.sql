-- Blindar el borrado con historial y moderar las ediciones de contenido.
--
-- Cierra las dos decisiones que dejo abiertas 20261220000000 (gestionar mis
-- clips):
--
--  A) El servidor dejaba que la DUEÑA borrara un clip con compras: el disparador
--     lo convertia en borrado logico y `tiene_acceso` exige `borrado_at is null`,
--     asi que quien habia pagado perdia el acceso al instante. La pantalla ya no
--     ofrecia «Eliminar», pero la politica `clips_delete_propio` seguia dejando
--     hacer el DELETE directo por la API. Ahora el servidor lo RECHAZA con un
--     mensaje; solo la administracion puede borrar (de forma logica) algo con
--     historial, y entonces el clip sale del catalogo.
--
--  B) Cambiar titulo, descripcion o portada de un clip YA aprobado salia directo
--     al catalogo sin moderar. Ahora pasa por la MISMA regla de confianza del
--     alta (`creadora_autoaprueba`): si la creadora es de confianza el cambio
--     queda en vivo y administracion recibe un aviso; si no, el clip vuelve a
--     `pendiente` (sale del catalogo hasta que se apruebe) y la creadora lo sabe.
--     Precio, renta y visibilidad siguen en vivo y no generan aviso.
--
-- QUE NO TOCA: `comprar_clip`, `rentar_clip`, comisiones, ni el libro. Los
-- permisos de UPDATE sobre `clips` siguen revocados al cliente.

-- ---------- La regla de confianza, en un solo sitio ----------
--
-- Es exactamente la del INSERT (20260912000001 / 20260916000000): sin la bandera
-- `moderacion_previa_forzada`, con identidad verificada y al menos cinco clips ya
-- aprobados. Se saca a una funcion para que el alta y la edicion NO puedan
-- discrepar. Ojo: al editar, el clip que se edita ya cuenta entre los aprobados.

create or replace function public.creadora_autoaprueba(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.ajuste_bool('moderacion_previa_forzada')
     and coalesce((select p.identidad_verificada from public.profiles p where p.id = p_uid), false)
     and (select count(*) from public.clips c
           where c.creator_id = p_uid and c.estado = 'aprobado') >= 5;
$$;
revoke all on function public.creadora_autoaprueba(uuid) from public, anon, authenticated;

-- El INSERT llama a la funcion; el resto del disparador queda igual.
create or replace function public.clips_publicar_alta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.tipo <> 'creadora' then
      -- El contenido de la plataforma no pasa por moderacion: lo sube quien
      -- administra, que es justamente quien moderaria.
      new.estado := 'aprobado';
    elsif public.creadora_autoaprueba(new.creator_id) then
      new.estado := 'aprobado';
    else
      new.estado := 'pendiente';
    end if;
  end if;

  -- Un clip borrado no se ve, sea cual sea su estado de moderacion.
  new.published := (new.estado = 'aprobado' and new.borrado_at is null);
  if new.published and new.published_at is null then
    new.published_at := now();
  elsif not new.published then
    new.published_at := null;
  end if;
  return new;
end; $$;
revoke all on function public.clips_publicar_alta() from public, anon, authenticated;

-- ---------- A) Borrar con historial ----------
--
-- Sin historial -> DELETE duro, como siempre.
-- Con historial:
--   - una persona que NO es administradora: se rechaza, la fila queda intacta;
--   - administracion: borrado logico (`borrado_at`, purga a los 30 dias) y el
--     clip sale del catalogo. No hace falta tocar `estado`: `clips_publicar_alta`
--     calcula `published = (estado = 'aprobado' and borrado_at is null)` en cada
--     UPDATE, asi que el borrado logico ya lo baja. Aqui se pone tambien de forma
--     explicita para no depender de ese orden de disparadores.
--   - sin sesion (funciones internas / service_role): borrado logico, como antes.
--     Nadie con una sesion de usuario llega por aqui.

create or replace function public.clips_no_borrar_con_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare quien uuid := auth.uid(); admin boolean := false;
begin
  if public.clip_tiene_historial(old.id) then
    if quien is not null then admin := public.es_admin(quien); end if;
    if quien is not null and not admin then
      raise exception 'Este clip ya tiene compras, rentas o reportes y no se puede eliminar. Usa «Dejar de venderlo ya» o el retiro total.'
        using errcode = 'restrict_violation';
    end if;
    update public.clips
       set borrado_at        = coalesce(borrado_at, now()),
           borrado_por       = coalesce(borrado_por, quien),
           borrado_motivo    = coalesce(borrado_motivo,
                                 case when admin then 'Borrado por administración' else 'Borrado por el sistema' end),
           purgar_despues_de = coalesce(purgar_despues_de, now() + interval '30 days'),
           published         = false,
           destacado_orden   = null, destacado_desde = null
     where id = old.id;
    return null;  -- cancela el DELETE: la fila se queda
  end if;
  return old;
end; $$;
revoke all on function public.clips_no_borrar_con_historial() from public, anon, authenticated;

-- El catalogo tampoco muestra nada borrado. `borrado_at` no estaba abierta a
-- `anon`; abrirla no filtra nada: en lo que `anon` puede ver (clips publicados de
-- cuentas no baneadas) vale siempre null, porque un clip borrado no esta publicado.
grant select (borrado_at) on public.clips to anon;

create or replace function public.explorar_ids(
  p_semilla text,
  p_filtro  text default 'todo',
  p_desde   int  default 0,
  p_cuantos int  default 30
) returns table (id uuid)
language sql stable security invoker set search_path = public as $$
  select c.id
    from public.clips c
   where c.published
     and c.borrado_at is null
     and (c.caduca_at is null or c.caduca_at > now())
     and case p_filtro
           when 'gratis' then c.visibility = 'gratis'
           when 'pago'   then c.visibility = 'pago'
           else true
         end
   order by c.destacado_orden asc nulls last,
            md5(coalesce(p_semilla, '') || c.id::text),
            c.id
  offset greatest(coalesce(p_desde, 0), 0)
   limit least(greatest(coalesce(p_cuantos, 30), 1), 60);
$$;
revoke all on function public.explorar_ids(text, text, int, int) from public;
grant execute on function public.explorar_ids(text, text, int, int) to anon, authenticated;

-- ---------- B) Ediciones de contenido ----------
--
-- Una fila por edicion de titulo/descripcion/portada de un clip que estaba
-- aprobado. `en_revision` = el cambio mando el clip a moderacion (la creadora no
-- era de confianza); si no, quedo en vivo y es un aviso informativo. No es un
-- registro de auditoria (eso es `admin_log`): solo alimenta `admin_avisos`.

create table public.avisos_edicion_clip (
  id          bigserial primary key,
  clip_id     uuid not null references public.clips (id) on delete cascade,
  creadora_id uuid not null references public.profiles (id) on delete cascade,
  campos      text[] not null check (cardinality(campos) > 0),
  en_revision boolean not null,
  created_at  timestamptz not null default now()
);
create index avisos_edicion_clip_clip_idx on public.avisos_edicion_clip (clip_id, created_at desc);
create index avisos_edicion_clip_at_idx   on public.avisos_edicion_clip (created_at desc);
alter table public.avisos_edicion_clip enable row level security;
revoke all on public.avisos_edicion_clip from anon, authenticated;

-- ---------- editar_mi_clip ----------
-- Igual que en 20261220000000, mas: si cambian titulo o descripcion de un clip
-- aprobado, pasa por la regla de confianza. Devuelve `en_revision` para que la
-- pantalla pueda decirselo a la creadora.

create or replace function public.editar_mi_clip(
  p_clip uuid,
  p_titulo text,
  p_descripcion text,
  p_visibilidad text default null,
  p_precio int default null,
  p_renta_horas int default null,
  p_renta_coins int default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clips;
  titulo text := btrim(coalesce(p_titulo, ''));
  descr  text := nullif(btrim(coalesce(p_descripcion, '')), '');
  vis    public.visibilidad_clip;
  precio int;
  r_horas int;
  r_coins int;
  antes  jsonb := '{}'::jsonb;
  despues jsonb := '{}'::jsonb;
  campos text[] := '{}';
  nuevo_estado public.estado_clip;
  en_revision boolean := false;
begin
  c := public.mi_clip_exigir(p_clip);
  nuevo_estado := c.estado;

  if char_length(titulo) not between 1 and 90 then
    raise exception 'El título tiene que tener entre 1 y 90 caracteres';
  end if;
  if descr is not null and char_length(descr) > 600 then
    raise exception 'La descripción no puede pasar de 600 caracteres';
  end if;

  if c.formato = 'album' then
    -- Un album solo cambia de titulo y descripcion: su precio lo fija la
    -- plataforma y no se renta.
    if p_visibilidad is not null or p_precio is not null
       or p_renta_horas is not null or p_renta_coins is not null then
      raise exception 'Un álbum solo permite cambiar su título y su descripción. Su precio lo fija la plataforma y no se renta.';
    end if;
    vis := c.visibility; precio := c.price_coins;
    r_horas := c.renta_horas; r_coins := c.renta_coins;
  else
    if p_visibilidad is null or p_visibilidad not in ('pago', 'suscriptores', 'gratis') then
      raise exception 'Elige cómo se vende: por clip, para suscriptores o gratis';
    end if;
    vis := p_visibilidad::public.visibilidad_clip;

    if vis = 'gratis' then
      -- Gratis fuerza precio 0 y sin renta.
      precio := 0; r_horas := null; r_coins := null;
    elsif vis = 'suscriptores' then
      if p_renta_horas is not null or p_renta_coins is not null then
        raise exception 'La renta solo existe en los clips que se venden por clip';
      end if;
      precio := 0; r_horas := null; r_coins := null;
    else
      -- Por clip: uno de los tres precios de la plataforma, o el que el clip ya
      -- tiene (para no obligar a cambiar uno puesto a mano antes).
      if p_precio is null then
        raise exception 'Elige un precio: 10, 20 o 40 dólares';
      end if;
      if not (p_precio in (1000, 2000, 4000)
              or (p_precio = c.price_coins and p_precio > 0 and c.visibility = 'pago')) then
        raise exception 'El precio tiene que ser de 10, 20 o 40 dólares';
      end if;
      precio := p_precio;

      -- Renta: las dos o ninguna. Ninguna = quitarla.
      if p_renta_horas is null and p_renta_coins is null then
        r_horas := null; r_coins := null;
      elsif p_renta_horas is null or p_renta_coins is null then
        raise exception 'Para rentarlo hace falta elegir las horas y el precio de la renta';
      else
        if p_renta_horas not in (48, 72) then
          raise exception 'La renta dura 48 o 72 horas';
        end if;
        if p_renta_coins <= 0 then
          raise exception 'El precio de la renta tiene que ser mayor que cero';
        end if;
        if p_renta_coins >= precio then
          raise exception 'La renta tiene que costar menos que comprarlo';
        end if;
        r_horas := p_renta_horas; r_coins := p_renta_coins;
      end if;
    end if;
  end if;

  -- Solo lo que cambia: antes y despues, para la Bitacora.
  if titulo is distinct from c.title then
    antes := antes || jsonb_build_object('titulo', c.title);
    despues := despues || jsonb_build_object('titulo', titulo);
    campos := array_append(campos, 'el título');
  end if;
  if descr is distinct from c.description then
    antes := antes || jsonb_build_object('descripcion', c.description);
    despues := despues || jsonb_build_object('descripcion', descr);
    campos := array_append(campos, 'la descripción');
  end if;
  if vis is distinct from c.visibility then
    antes := antes || jsonb_build_object('visibilidad', c.visibility);
    despues := despues || jsonb_build_object('visibilidad', vis);
  end if;
  if precio is distinct from c.price_coins then
    antes := antes || jsonb_build_object('precio', c.price_coins);
    despues := despues || jsonb_build_object('precio', precio);
  end if;
  if r_horas is distinct from c.renta_horas then
    antes := antes || jsonb_build_object('renta_horas', c.renta_horas);
    despues := despues || jsonb_build_object('renta_horas', r_horas);
  end if;
  if r_coins is distinct from c.renta_coins then
    antes := antes || jsonb_build_object('renta_coins', c.renta_coins);
    despues := despues || jsonb_build_object('renta_coins', r_coins);
  end if;

  if despues = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'cambios', 0, 'en_revision', false);
  end if;

  -- Contenido de un clip APROBADO: misma regla de confianza que el alta. Lo que
  -- no es contenido (precio, renta, visibilidad) no entra aqui.
  if cardinality(campos) > 0 and c.estado = 'aprobado' and not public.creadora_autoaprueba(c.creator_id) then
    nuevo_estado := 'pendiente';
    en_revision := true;
    antes := antes || jsonb_build_object('estado', c.estado);
    despues := despues || jsonb_build_object('estado', nuevo_estado);
  end if;

  -- `clips_publicar_alta` recalcula `published` a partir del estado: al pasar a
  -- pendiente el clip sale del catalogo. Quien lo compro conserva el acceso
  -- (`tiene_acceso` no mira `published` para compras, rentas ni suscripciones).
  update public.clips
     set title = titulo, description = descr, visibility = vis,
         price_coins = precio, renta_horas = r_horas, renta_coins = r_coins,
         estado = nuevo_estado
   where id = p_clip;

  if cardinality(campos) > 0 and c.estado = 'aprobado' then
    insert into public.avisos_edicion_clip (clip_id, creadora_id, campos, en_revision)
    values (p_clip, c.creator_id, campos, en_revision);
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'editar_clip', c.creator_id,
          jsonb_build_object('clip', p_clip, 'antes', antes, 'despues', despues));
  return jsonb_build_object('ok', true, 'en_revision', en_revision,
                            'cambios', (select count(*) from jsonb_object_keys(despues)));
end; $$;
revoke all on function public.editar_mi_clip(uuid, text, text, text, int, int, int) from public, anon;
grant execute on function public.editar_mi_clip(uuid, text, text, text, int, int, int) to authenticated;

-- ---------- cambiar_mi_portada ----------

create or replace function public.cambiar_mi_portada(p_clip uuid, p_cover_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clips;
  ruta text := btrim(coalesce(p_cover_path, ''));
  antes jsonb;
  despues jsonb;
  nuevo_estado public.estado_clip;
  en_revision boolean := false;
begin
  c := public.mi_clip_exigir(p_clip);
  nuevo_estado := c.estado;

  if ruta = '' then
    raise exception 'Falta la portada';
  end if;
  -- En la carpeta de la creadora (lo vigila tambien `clips_archivos_en_su_carpeta`,
  -- pero aqui se dice en claro antes de llegar al disparador).
  if left(ruta, length(c.creator_id::text) + 1) <> c.creator_id::text || '/' then
    raise exception 'La portada tiene que estar en tu carpeta';
  end if;
  -- Y en los DOS buckets: sin la nitida, la portada de pago no tendria original.
  if not exists (select 1 from storage.objects o where o.bucket_id = 'clip-covers' and o.name = ruta)
  or not exists (select 1 from storage.objects o where o.bucket_id = 'clip-covers-full' and o.name = ruta) then
    raise exception 'La portada no se terminó de subir. Inténtalo de nuevo.';
  end if;

  if ruta is not distinct from c.cover_path then
    return jsonb_build_object('ok', true, 'cambios', 0, 'en_revision', false);
  end if;

  antes   := jsonb_build_object('cover_path', c.cover_path);
  despues := jsonb_build_object('cover_path', ruta);

  -- Una portada nueva en un clip APROBADO pasa por la regla de confianza.
  if c.estado = 'aprobado' and not public.creadora_autoaprueba(c.creator_id) then
    nuevo_estado := 'pendiente';
    en_revision := true;
    antes := antes || jsonb_build_object('estado', c.estado);
    despues := despues || jsonb_build_object('estado', nuevo_estado);
  end if;

  update public.clips set cover_path = ruta, estado = nuevo_estado where id = p_clip;

  if c.estado = 'aprobado' then
    insert into public.avisos_edicion_clip (clip_id, creadora_id, campos, en_revision)
    values (p_clip, c.creator_id, array['la portada'], en_revision);
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'cambiar_portada', c.creator_id,
          jsonb_build_object('clip', p_clip, 'antes', antes, 'despues', despues));
  return jsonb_build_object('ok', true, 'cambios', 1, 'en_revision', en_revision);
end; $$;
revoke all on function public.cambiar_mi_portada(uuid, text) from public, anon;
grant execute on function public.cambiar_mi_portada(uuid, text) to authenticated;

comment on function public.creadora_autoaprueba is
  'La regla de confianza del alta, en un solo sitio: sin moderacion_previa_forzada, identidad verificada y al menos 5 clips aprobados. La usan clips_publicar_alta (INSERT) y la edicion de contenido.';
comment on function public.editar_mi_clip is
  'La creadora edita titulo, descripcion, como se vende, precio (10/20/40 o el que ya tiene) y renta de un clip SUYO. Titulo/descripcion de un clip aprobado pasan por creadora_autoaprueba (en vivo + aviso, o a pendiente). Precio/renta/visibilidad siempre en vivo. Registra antes/despues en admin_log.';
comment on function public.cambiar_mi_portada is
  'Apunta cover_path a una ruta ya subida a clip-covers y clip-covers-full. En un clip aprobado pasa por creadora_autoaprueba. No borra portadas anteriores.';
comment on table public.avisos_edicion_clip is
  'Ediciones de titulo/descripcion/portada de clips aprobados. Solo alimenta admin_avisos; la auditoria es admin_log.';

-- ---------- admin_avisos: moderacion de ediciones y aviso de edicion en vivo ----------
-- Misma funcion de 20261218000000. Cambios: en la cola de moderacion, un clip
-- que volvio a pendiente por una edicion se titula «Edición por moderar»; y un
-- tipo nuevo, `edicion`, para lo que quedo en vivo.

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
           case when ed.at is not null then 'Edición por moderar'
                when c.formato = 'album' then 'Álbum nuevo por moderar'
                else 'Video nuevo por moderar' end,
           '«' || c.title || '» de ' || public.aviso_admin_nombre(c.creator_id)
             || case when ed.at is not null then ' · cambió ' || ed.campos else '' end
             || case when not coalesce(p.identidad_verificada, false) then ' · identidad sin verificar' else '' end,
           '/admin/moderacion',
           -- Una edicion pasa a ser notable cuando se hizo, no cuando se subio el clip.
           coalesce(ed.at, c.created_at), true
      from public.clips c join public.profiles p on p.id = c.creator_id
      left join lateral (
        select e.created_at as at, array_to_string(e.campos, ', ') as campos
          from public.avisos_edicion_clip e
         where e.clip_id = c.id and e.en_revision
           and e.created_at > coalesce(c.revisado_at, 'epoch')
         order by e.created_at desc limit 1
      ) ed on true
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

    union all
    -- Ediciones de titulo, descripcion o portada que quedaron EN VIVO (la creadora
    -- ya es de confianza): informativo, sin cola que resolver. Se muestran 30 dias.
    select 'ed:' || e.id::text, 'edicion',
           'Clip editado en vivo',
           '«' || c.title || '» de ' || public.aviso_admin_nombre(e.creadora_id)
             || ' · cambió ' || array_to_string(e.campos, ', '),
           '/admin/contenido', e.created_at, false
      from public.avisos_edicion_clip e
      join public.clips c on c.id = e.clip_id
     where not e.en_revision and c.borrado_at is null
       and e.created_at > now() - interval '30 days'
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
  'Lista de avisos de la plataforma para administracion, armada al pedirla desde las colas reales. `nuevo` = llego despues del ultimo visto_at de esta administradora. No es mis_avisos. Incluye ediciones de clips (en vivo o por moderar).';
