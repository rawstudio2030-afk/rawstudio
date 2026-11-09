-- Gestionar mis clips desde el Estudio.
--
-- Desde 20261115000000 la creadora no puede hacer UPDATE sobre `clips` (ni por
-- la API ni por SQL): solo insertar y borrar el suyo. Eso es lo correcto —el
-- estado, la moderacion, los destacados y el borrado son de la plataforma—,
-- pero la dejo sin forma de corregir un titulo, cambiar un precio o poner otra
-- portada. Estas funciones son esa forma: cada una es SECURITY DEFINER,
-- valida que el clip sea SUYO y toca SOLO las columnas que le corresponden.
-- No se devuelve ningun permiso de UPDATE al cliente.
--
--   editar_mi_clip           titulo, descripcion, como se vende, precio y renta
--   cambiar_mi_portada       la portada (ya subida a sus dos buckets)
--   dejar_de_vender_mi_clip  sacarlo del catalogo YA, sin quitarle nada a quien lo compro
--   mi_clip_tiene_historial  si tiene compras, rentas, reportes o reembolsos
--
-- Todo cambio queda en `admin_log` (Bitacora) con antes y despues.
--
-- QUE NO HACEN: no tocan `estado`, la moderacion, `published`, los destacados
-- ni la caducidad programada; no tocan `comprar_clip` ni `rentar_clip`, ni
-- comisiones, ni el libro. Cambiar un precio o quitar la renta solo afecta a
-- compras NUEVAS: lo que ya se pago se queda como se pago.

-- ---------- Un solo criterio de «tiene historial» ----------
--
-- Es el mismo que usaba `clips_no_borrar_con_historial` (20261120): compras,
-- rentas, reportes o reembolsos. Se saca a una funcion para que la pantalla de
-- la creadora («¿te dejo eliminarlo?») y el disparador que protege el borrado
-- NO puedan discrepar. El disparador hace exactamente lo mismo que antes.

create or replace function public.clip_tiene_historial(p_clip uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.purchases p where p.clip_id = p_clip)
      or exists (select 1 from public.rentals r where r.clip_id = p_clip)
      or exists (select 1 from public.reportes x where x.clip_id = p_clip)
      or exists (select 1 from public.reembolsos_retiro e where e.clip_id = p_clip);
$$;
revoke all on function public.clip_tiene_historial(uuid) from public, anon, authenticated;

create or replace function public.clips_no_borrar_con_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.clip_tiene_historial(old.id) then
    update public.clips
       set borrado_at        = coalesce(borrado_at, now()),
           borrado_por       = coalesce(borrado_por, auth.uid()),
           borrado_motivo    = coalesce(borrado_motivo, 'Borrado por quien lo subio'),
           purgar_despues_de = coalesce(purgar_despues_de, now() + interval '30 days'),
           destacado_orden   = null, destacado_desde = null
     where id = old.id;
    return null;  -- cancela el DELETE: la fila se queda
  end if;
  return old;
end; $$;
revoke all on function public.clips_no_borrar_con_historial() from public, anon, authenticated;

-- ---------- Comprobacion comun: el clip existe y es de quien llama ----------
-- Devuelve la fila YA BLOQUEADA, para que dos cambios a la vez no se pisen.

create or replace function public.mi_clip_exigir(p_clip uuid)
returns public.clips language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  c public.clips;
begin
  if yo is null then
    raise exception 'Necesitas entrar para cambiar tus clips' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.clips where id = p_clip for update;
  if not found then
    raise exception 'Ese clip no existe';
  end if;
  if c.creator_id <> yo then
    raise exception 'Ese clip no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  if not public.cuenta_activa(yo) then
    raise exception 'Tu cuenta no está activa, así que por ahora no puedes cambiar tus clips'
      using errcode = 'insufficient_privilege';
  end if;
  if c.borrado_at is not null then
    raise exception 'Ese clip ya fue borrado';
  end if;
  return c;
end; $$;
revoke all on function public.mi_clip_exigir(uuid) from public, anon, authenticated;

-- ---------- ¿Tiene historial? (para decidir si se ofrece «Eliminar») ----------

create or replace function public.mi_clip_tiene_historial(p_clip uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare c public.clips;
begin
  -- Sin `for update`: es solo una lectura.
  select * into c from public.clips where id = p_clip;
  if not found then raise exception 'Ese clip no existe'; end if;
  if c.creator_id is distinct from auth.uid() then
    raise exception 'Ese clip no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  return public.clip_tiene_historial(p_clip);
end; $$;
revoke all on function public.mi_clip_tiene_historial(uuid) from public, anon;
grant execute on function public.mi_clip_tiene_historial(uuid) to authenticated;

-- ---------- Editar datos, precio y renta ----------

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
begin
  c := public.mi_clip_exigir(p_clip);

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
  end if;
  if descr is distinct from c.description then
    antes := antes || jsonb_build_object('descripcion', c.description);
    despues := despues || jsonb_build_object('descripcion', descr);
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
    return jsonb_build_object('ok', true, 'cambios', 0);
  end if;

  update public.clips
     set title = titulo, description = descr, visibility = vis,
         price_coins = precio, renta_horas = r_horas, renta_coins = r_coins
   where id = p_clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'editar_clip', c.creator_id,
          jsonb_build_object('clip', p_clip, 'antes', antes, 'despues', despues));
  return jsonb_build_object('ok', true, 'cambios', (select count(*) from jsonb_object_keys(despues)));
end; $$;
revoke all on function public.editar_mi_clip(uuid, text, text, text, int, int, int) from public, anon;
grant execute on function public.editar_mi_clip(uuid, text, text, text, int, int, int) to authenticated;

-- ---------- Cambiar la portada ----------
-- Los dos archivos (la publica de 240 px y la nitida privada) ya se subieron, a
-- la misma ruta, por `subirPortada`. Esto solo apunta el clip a esa ruta. Las
-- portadas anteriores NO se borran.

create or replace function public.cambiar_mi_portada(p_clip uuid, p_cover_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clips;
  ruta text := btrim(coalesce(p_cover_path, ''));
begin
  c := public.mi_clip_exigir(p_clip);

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
    return jsonb_build_object('ok', true, 'cambios', 0);
  end if;

  update public.clips set cover_path = ruta where id = p_clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'cambiar_portada', c.creator_id,
          jsonb_build_object('clip', p_clip,
                             'antes', jsonb_build_object('cover_path', c.cover_path),
                             'despues', jsonb_build_object('cover_path', ruta)));
  return jsonb_build_object('ok', true, 'cambios', 1);
end; $$;
revoke all on function public.cambiar_mi_portada(uuid, text) from public, anon;
grant execute on function public.cambiar_mi_portada(uuid, text) to authenticated;

-- ---------- Dejar de venderlo YA ----------
-- Lo saca del catalogo ahora mismo: nadie mas puede comprarlo ni rentarlo. Quien
-- ya lo compro o lo renta lo conserva, porque eso fue lo que se le vendio.
-- Es el «ahora» que `fijar_caducidad` no permite (exige fecha futura).
--
-- NO convierte un retiro total en dejar de venderse: eso le devolveria el
-- acceso a alguien a quien ya se le quito (o cancelaria un retiro total
-- programado). Si ya hay un retiro total, se dice y se remite a la fecha.

create or replace function public.dejar_de_vender_mi_clip(p_clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.clips;
begin
  c := public.mi_clip_exigir(p_clip);

  if not c.published then
    raise exception 'Este clip todavía no está publicado, así que no se está vendiendo. Si no lo quieres, elimínalo.';
  end if;
  if c.caduca_at is not null and c.caduca_at <= now() then
    raise exception 'Este clip ya dejó de venderse';
  end if;
  if c.caduca_at is not null and c.caduca_modo = 'retiro_total' then
    raise exception 'Este clip ya tiene un retiro total con fecha. Cámbiala o quítala desde «Fecha de retiro».';
  end if;

  update public.clips set caduca_at = now(), caduca_modo = 'deja_de_venderse' where id = p_clip;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'dejar_de_vender_clip', c.creator_id,
          jsonb_build_object('clip', p_clip,
                             'antes', jsonb_build_object('caduca_at', c.caduca_at, 'modo', c.caduca_modo),
                             'despues', jsonb_build_object('caduca_at', now(), 'modo', 'deja_de_venderse')));
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.dejar_de_vender_mi_clip(uuid) from public, anon;
grant execute on function public.dejar_de_vender_mi_clip(uuid) to authenticated;

comment on function public.editar_mi_clip is
  'La creadora edita titulo, descripcion, como se vende, precio (10/20/40 o el que ya tiene) y renta de un clip SUYO. No toca estado ni moderacion. Registra antes/despues en admin_log.';
comment on function public.cambiar_mi_portada is
  'Apunta cover_path a una ruta ya subida a clip-covers y clip-covers-full. No borra portadas anteriores.';
comment on function public.dejar_de_vender_mi_clip is
  'Saca el clip del catalogo ya (caduca_at = now(), deja_de_venderse). Quien lo compro o renta conserva el acceso.';
