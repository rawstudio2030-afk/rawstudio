-- Ficha completa de una cuenta en el panel (modulo Usuarios).
--
-- Hasta ahora la ficha traia tres listas (clips, movimientos, acciones) de
-- admin_usuario_detalle. Para ver todo lo demas —comentarios, compras, pedidos,
-- cobros, consultas, reportes, bitacora— habia que ir modulo por modulo.
--
-- admin_usuario_seccion(p_usuario, p_seccion) devuelve UNA seccion a la vez: la
-- interfaz la pide cuando se abre la pestana, no todas juntas. Cada lista tiene
-- tope y viene de la mas reciente a la mas vieja.
--
-- DATOS DE COBRO. payout_accounts no es legible por un admin desde las tablas A
-- PROPOSITO (ver 20260829000000_pagos.sql). Esta migracion no cambia esa politica:
--   - admin_usuario_seccion('cobros') devuelve la CLABE ENMASCARADA (ultimos 4).
--   - La CLABE completa solo sale por admin_ver_clabe(), que exige un motivo y
--     deja una fila en admin_log (accion 'ver_clabe', con el motivo, SIN la CLABE).
-- No se pide «la contrasena de la usuaria»: un admin no debe conocerla, y quien
-- entra con Google no tiene. El control es el motivo obligatorio + la bitacora,
-- que es inmutable (bitacora_sin_cambios).
--
-- Solo lectura, salvo la fila de bitacora de admin_ver_clabe.

create or replace function public.admin_usuario_seccion(p_usuario uuid, p_seccion text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver esta ficha'
      using errcode = 'insufficient_privilege';
  end if;
  if p_seccion not in ('resumen', 'contenido', 'comentarios', 'compras', 'cobros', 'consultas', 'bitacora') then
    raise exception 'Seccion desconocida: %', p_seccion;
  end if;
  if not exists (select 1 from public.profiles where id = p_usuario) then
    raise exception 'Esa cuenta no existe';
  end if;

  return case p_seccion

  -- ---------------------------------------------------------------- resumen
  when 'resumen' then (
    select jsonb_build_object(
      'correo', u.email,
      'telefono', u.phone,
      'nombre_google', u.raw_user_meta_data ->> 'full_name',
      'proveedores', coalesce((select jsonb_agg(i.provider) from auth.identities i
                                where i.user_id = u.id), '[]'::jsonb),
      'creada', u.created_at,
      'ultimo_acceso', u.last_sign_in_at,
      'correo_confirmado', u.email_confirmed_at is not null,
      'es_creadora', p.is_creator,
      'edad_confirmada', p.adult_confirmed_at,
      'identidad_verificada', p.identidad_verificada,
      'identidad_verificada_at', p.identidad_verificada_at,
      'suspendida_at', p.suspended_at,
      'baneada_at', p.baneado_at,
      'expediente', (select jsonb_build_object(
          'identificacion', e.identificacion_path is not null,
          'consentimiento', e.consentimiento_path is not null,
          'consentimiento_fecha', e.consentimiento_fecha,
          'alta_at', e.alta_at, 'nota', e.nota)
        from public.expedientes e where e.user_id = p.id),
      'telegram_vinculada_at', (select t.vinculada_at from public.telegram_cuentas t
                                 where t.user_id = p.id),
      'tiene_cuenta_cobro', exists (select 1 from public.payout_accounts a where a.user_id = p.id),
      'consentimientos', coalesce((select jsonb_agg(jsonb_build_object(
          'tipo', c.tipo, 'version', c.version, 'otorgado', c.otorgado,
          'created_at', c.created_at) order by c.created_at desc)
        from public.consentimientos c where c.user_id = p.id), '[]'::jsonb),
      'verificaciones', coalesce((select jsonb_agg(jsonb_build_object(
          'estado', v.estado::text, 'motivo', v.motivo, 'created_at', v.created_at)
          order by v.created_at desc)
        from public.verificaciones v where v.user_id = p.id), '[]'::jsonb)
    )
    from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_usuario)

  -- --------------------------------------------------------------- contenido
  -- Lo que subio y en que quedo: aprobado, pendiente, rechazado (con motivo y
  -- quien lo reviso) o borrado.
  when 'contenido' then jsonb_build_object('clips', coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', c.id, 'titulo', c.title, 'tipo', c.tipo::text, 'estado', c.estado::text,
        'publicado', c.published, 'visibilidad', c.visibility::text,
        'precio', c.price_coins, 'fotos', c.num_fotos,
        'motivo_rechazo', c.motivo_rechazo,
        'revisado_at', c.revisado_at,
        'revisado_por', (select r.handle from public.profiles r where r.id = c.revisado_por),
        'borrado_at', c.borrado_at, 'borrado_motivo', c.borrado_motivo,
        'created_at', c.created_at) order by c.created_at desc)
    from (select * from public.clips x where x.creator_id = p_usuario
           order by x.created_at desc limit 200) c), '[]'::jsonb))

  -- ------------------------------------------------------------- comentarios
  when 'comentarios' then jsonb_build_object(
    'recibidos', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'texto', m.texto, 'created_at', m.created_at, 'borrado_at', m.borrado_at,
          'autora', (select a.handle from public.profiles a where a.id = m.autora_id),
          'clip', (select k.title from public.clips k where k.id = m.clip_id))
        order by m.created_at desc)
      from (select * from public.comentarios_clip x
             where x.autora_id <> p_usuario
               and x.clip_id in (select k.id from public.clips k where k.creator_id = p_usuario)
             order by x.created_at desc limit 100) m), '[]'::jsonb),
    'hechos', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'texto', m.texto, 'created_at', m.created_at, 'borrado_at', m.borrado_at,
          'clip', (select k.title from public.clips k where k.id = m.clip_id))
        order by m.created_at desc)
      from (select * from public.comentarios_clip x
             where x.autora_id = p_usuario
             order by x.created_at desc limit 100) m), '[]'::jsonb))

  -- ----------------------------------------------------------------- compras
  -- Lo que compro, renta o pago (lo «bajado»), sus suscripciones, propinas,
  -- recargas y los pedidos personalizados (como quien pide o como creadora).
  when 'compras' then jsonb_build_object(
    'compras', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'precio', x.price_coins, 'created_at', x.created_at,
          'clip', (select k.title from public.clips k where k.id = x.clip_id)) order by x.created_at desc)
      from (select * from public.purchases p where p.user_id = p_usuario
             order by p.created_at desc limit 100) x), '[]'::jsonb),
    'rentas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'precio', x.price_coins, 'inicio', x.inicio,
          'vence', x.vence, 'clip', (select k.title from public.clips k where k.id = x.clip_id))
          order by x.created_at desc)
      from (select * from public.rentals r where r.user_id = p_usuario
             order by r.created_at desc limit 100) x), '[]'::jsonb),
    'suscripciones', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'estado', x.estado::text, 'inicio', x.inicio,
          'periodo_fin', x.periodo_fin, 'cancela_al_fin', x.cancela_al_fin,
          'como', case when x.subscriber_id = p_usuario then 'suscriptora' else 'creadora' end,
          'otra', (select o.handle from public.profiles o
                    where o.id = case when x.subscriber_id = p_usuario then x.creator_id else x.subscriber_id end))
          order by x.created_at desc)
      from (select * from public.subscriptions s
             where s.subscriber_id = p_usuario or s.creator_id = p_usuario
             order by s.created_at desc limit 100) x), '[]'::jsonb),
    'propinas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'coins', x.coins, 'mensaje', x.mensaje,
          'created_at', x.created_at,
          'como', case when x.de_id = p_usuario then 'dio' else 'recibio' end,
          'otra', (select o.handle from public.profiles o
                    where o.id = case when x.de_id = p_usuario then x.para_id else x.de_id end))
          order by x.created_at desc)
      from (select * from public.tips t where t.de_id = p_usuario or t.para_id = p_usuario
             order by t.created_at desc limit 100) x), '[]'::jsonb),
    'recargas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'concepto', x.concepto::text, 'coins', x.coins,
          'monto_mxn', x.monto_mxn, 'estado', x.estado::text, 'proveedor', x.proveedor::text,
          'created_at', x.created_at, 'pagado_at', x.pagado_at) order by x.created_at desc)
      from (select * from public.payment_orders o where o.user_id = p_usuario
             order by o.created_at desc limit 100) x), '[]'::jsonb),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'estado', x.estado::text,
          'descripcion', left(x.descripcion, 300), 'oferta', x.oferta_coins, 'acordado', x.acordado_coins,
          'entrega_max', x.entrega_max, 'created_at', x.created_at,
          'como', case when x.fan_id = p_usuario then 'pidio' else 'recibio' end,
          'otra', (select o.handle from public.profiles o
                    where o.id = case when x.fan_id = p_usuario then x.creator_id else x.fan_id end))
          order by x.created_at desc)
      from (select * from public.custom_requests r
             where r.fan_id = p_usuario or r.creator_id = p_usuario
             order by r.created_at desc limit 100) x), '[]'::jsonb))

  -- ------------------------------------------------------------------ cobros
  -- La CLABE sale ENMASCARADA. La completa solo por admin_ver_clabe().
  when 'cobros' then jsonb_build_object(
    'cuenta', (select jsonb_build_object(
        'titular', a.titular, 'banco', a.banco,
        'clabe', repeat('*', 14) || right(a.clabe, 4),
        'verificado', a.verificado, 'regimen', a.regimen::text,
        'tiene_rfc', a.rfc is not null, 'actualizada', a.updated_at)
      from public.payout_accounts a where a.user_id = p_usuario),
    'retiros', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'coins', x.coins, 'estado', x.estado::text,
          'banco', x.banco, 'titular', x.titular,
          'clabe', repeat('*', 14) || right(x.clabe, 4),
          'motivo_rechazo', x.motivo_rechazo, 'created_at', x.created_at, 'resuelta_at', x.resuelta_at)
        order by x.created_at desc)
      from (select * from public.solicitudes_retiro s where s.creator_id = p_usuario
             order by s.created_at desc limit 100) x), '[]'::jsonb))

  -- ------------------------------------------------------ consultas y reportes
  when 'consultas' then jsonb_build_object(
    'consultas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'created_at', x.created_at, 'ultimo_at', x.ultimo_at,
          'como', case when x.cliente_id = p_usuario then 'cliente' else 'creadora' end,
          'otra', (select o.handle from public.profiles o
                    where o.id = case when x.cliente_id = p_usuario then x.creadora_id else x.cliente_id end),
          'clip', (select k.title from public.clips k where k.id = x.clip_id))
        order by x.created_at desc)
      from (select * from public.consultas c
             where c.cliente_id = p_usuario or c.creadora_id = p_usuario
             order by c.created_at desc limit 100) x), '[]'::jsonb),
    'reportes_hechos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'motivo', x.motivo::text, 'comentario', x.comentario,
          'estado', x.estado::text, 'created_at', x.created_at, 'nota_resolucion', x.nota_resolucion)
        order by x.created_at desc)
      from (select * from public.reportes r where r.reporta_id = p_usuario
             order by r.created_at desc limit 100) x), '[]'::jsonb),
    'reportes_recibidos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'motivo', x.motivo::text, 'comentario', x.comentario,
          'estado', x.estado::text, 'created_at', x.created_at, 'nota_resolucion', x.nota_resolucion,
          'clip', (select k.title from public.clips k where k.id = x.clip_id))
        order by x.created_at desc)
      from (select * from public.reportes r
             where r.perfil_id = p_usuario
                or r.clip_id in (select k.id from public.clips k where k.creator_id = p_usuario)
             order by r.created_at desc limit 100) x), '[]'::jsonb))

  -- ---------------------------------------------------------------- bitacora
  -- Lo que se hizo SOBRE la cuenta (altas, castigos, ajustes) y lo que hizo ELLA
  -- (sesiones). Va con IP porque la bitacora ya la guarda y la ve el admin.
  when 'bitacora' then jsonb_build_object('registros', coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', x.id, 'accion', x.accion, 'detalle', x.detalle, 'ip', host(x.ip), 'created_at', x.created_at,
        'admin', (select a.handle from public.profiles a where a.id = x.admin_id),
        'sobre_ella', x.objetivo = p_usuario, 'hecho_por_ella', x.admin_id = p_usuario)
      order by x.created_at desc)
    from (select * from public.admin_log l
           where l.objetivo = p_usuario or l.admin_id = p_usuario
           order by l.created_at desc limit 200) x), '[]'::jsonb))

  end;
end;
$$;

revoke all on function public.admin_usuario_seccion(uuid, text) from public, anon;
grant execute on function public.admin_usuario_seccion(uuid, text) to authenticated;

-- ---------------------------------------------------------------- ver la CLABE
-- Devuelve los datos de cobro COMPLETOS de una cuenta. Exige un motivo escrito
-- y lo deja en la bitacora junto con quien lo pidio (la CLABE NO se guarda ahi).
create or replace function public.admin_ver_clabe(p_usuario uuid, p_motivo text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  a public.payout_accounts;
  motivo text := btrim(coalesce(p_motivo, ''));
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver este dato'
      using errcode = 'insufficient_privilege';
  end if;
  if length(motivo) < 10 then
    raise exception 'Escribe el motivo (al menos 10 caracteres): queda registrado en la bitacora';
  end if;
  if length(motivo) > 300 then
    raise exception 'El motivo es demasiado largo (maximo 300 caracteres)';
  end if;

  select * into a from public.payout_accounts where user_id = p_usuario;
  if not found then
    raise exception 'Esta cuenta no tiene datos de cobro';
  end if;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'ver_clabe', p_usuario, jsonb_build_object('motivo', motivo));

  return jsonb_build_object('titular', a.titular, 'banco', a.banco, 'clabe', a.clabe);
end;
$$;

revoke all on function public.admin_ver_clabe(uuid, text) from public, anon;
grant execute on function public.admin_ver_clabe(uuid, text) to authenticated;
