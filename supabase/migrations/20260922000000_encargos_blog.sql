-- Contenido a la medida (encargos) y blog.

-- ---------- Encargos ----------
--
-- El flujo es una negociacion: alguien propone y ofrece, la creadora acepta o
-- contraoferta, se paga, se entrega. El dinero NO se le entrega a la creadora
-- al pagar: queda retenido hasta la entrega. Sin eso, cobrar y no entregar
-- seria trivial, y la seccion de disputas del panel no tendria nada que
-- devolver.

create or replace function public.crear_encargo(
  creadora uuid, p_descripcion text, p_oferta int, p_dias int default 7
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); nuevo uuid;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  if creadora = yo then raise exception 'No puedes encargarte contenido a ti misma'; end if;
  if coalesce(trim(p_descripcion),'') = '' then
    raise exception 'Describe que quieres: sin eso no hay nada que aceptar';
  end if;
  if p_oferta <= 0 then raise exception 'La oferta debe ser mayor que cero'; end if;
  if not exists (select 1 from public.profiles where id = creadora and is_creator) then
    raise exception 'Esa persona no es creadora';
  end if;
  if not public.puede_cobrar(creadora) then
    raise exception 'Esa creadora todavia no puede recibir encargos';
  end if;
  -- Se comprueba el saldo al proponer, no solo al pagar: proponer algo que no
  -- se puede pagar hace perder el tiempo a las dos partes.
  if public.saldo(yo) < p_oferta then
    raise exception 'Te faltan % coins para esa oferta', p_oferta - public.saldo(yo);
  end if;

  insert into public.custom_requests
    (fan_id, creator_id, descripcion, oferta_coins, estado, entrega_max)
  values (yo, creadora, p_descripcion, p_oferta, 'propuesta',
          now() + (greatest(1, p_dias) || ' days')::interval)
  returning id into nuevo;

  insert into public.custom_request_messages (request_id, autor_id, cuerpo, oferta_coins)
  values (nuevo, yo, p_descripcion, p_oferta);

  return jsonb_build_object('ok', true, 'encargo', nuevo);
end; $$;

create or replace function public.responder_encargo(
  encargo uuid, cuerpo text default null, contraoferta int default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); e record;
begin
  select * into e from public.custom_requests where id = encargo;
  if e is null then raise exception 'Ese encargo no existe'; end if;
  if yo not in (e.fan_id, e.creator_id) then
    raise exception 'Ese encargo no es tuyo' using errcode='insufficient_privilege';
  end if;
  if e.estado in ('entregado','rechazado','cancelado') then
    raise exception 'Ese encargo ya esta cerrado';
  end if;

  insert into public.custom_request_messages (request_id, autor_id, cuerpo, oferta_coins)
  values (encargo, yo, cuerpo, contraoferta);

  update public.custom_requests
     set estado = case when e.estado = 'propuesta' then 'negociando'::public.estado_encargo
                       else e.estado end,
         oferta_coins = coalesce(contraoferta, oferta_coins),
         updated_at = now()
   where id = encargo;
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.aceptar_encargo(encargo uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); e record;
begin
  select * into e from public.custom_requests where id = encargo;
  if e is null then raise exception 'Ese encargo no existe'; end if;
  if e.creator_id <> yo then
    raise exception 'Solo la creadora acepta el encargo' using errcode='insufficient_privilege';
  end if;
  if e.estado not in ('propuesta','negociando') then
    raise exception 'Ese encargo ya no esta en negociacion';
  end if;

  update public.custom_requests
     set estado = 'aceptado', acordado_coins = e.oferta_coins, updated_at = now()
   where id = encargo;
  return jsonb_build_object('ok', true, 'acordado', e.oferta_coins);
end; $$;

create or replace function public.pagar_encargo(encargo uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); e record; precio int;
begin
  select * into e from public.custom_requests where id = encargo;
  if e is null then raise exception 'Ese encargo no existe'; end if;
  if e.fan_id <> yo then
    raise exception 'Solo quien lo encargo puede pagarlo' using errcode='insufficient_privilege';
  end if;
  if e.estado <> 'aceptado' then raise exception 'Ese encargo no esta aceptado todavia'; end if;

  precio := coalesce(e.acordado_coins, e.oferta_coins);
  if public.saldo(yo) < precio then
    raise exception 'Te faltan % coins', precio - public.saldo(yo);
  end if;

  -- Solo el cargo. A la creadora NO se le abona aqui: el dinero queda
  -- retenido por la plataforma hasta que entregue. Es lo unico que hace
  -- posible reembolsar si no cumple.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, -precio, 'compra_clip', encargo, yo, 'Encargo pagado');

  update public.custom_requests set estado = 'pagado', updated_at = now() where id = encargo;
  return jsonb_build_object('ok', true, 'retenido', precio);
end; $$;

create or replace function public.entregar_encargo(encargo uuid, clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); e record; precio int; comision int; para_ella int;
begin
  select * into e from public.custom_requests where id = encargo;
  if e is null then raise exception 'Ese encargo no existe'; end if;
  if e.creator_id <> yo then
    raise exception 'Solo la creadora entrega' using errcode='insufficient_privilege';
  end if;
  if e.estado not in ('pagado','en_proceso') then
    raise exception 'Ese encargo no esta pagado';
  end if;
  if not exists (select 1 from public.clips c where c.id = clip and c.creator_id = yo) then
    raise exception 'Ese clip no es tuyo';
  end if;

  precio    := coalesce(e.acordado_coins, e.oferta_coins);
  comision  := public.comision_de(precio);
  para_ella := precio - comision;

  -- AHORA si se libera lo retenido, y se le da acceso a quien pago.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo, para_ella, 'venta_clip', encargo, yo, 'Encargo entregado');

  insert into public.purchases (user_id, clip_id, price_coins)
  values (e.fan_id, clip, 0)
  on conflict do nothing;

  update public.custom_requests
     set estado = 'entregado', clip_id = clip, updated_at = now() where id = encargo;
  return jsonb_build_object('ok', true, 'cobrado', para_ella);
end; $$;

create or replace function public.mis_encargos()
returns table (id uuid, soy_creadora boolean, otra uuid, otra_handle text,
               descripcion text, coins int, estado text, entrega_max timestamptz,
               clip_id uuid, created_at timestamptz, mensajes int)
language sql security definer stable set search_path = '' as $$
  select e.id, e.creator_id = auth.uid(),
         case when e.creator_id = auth.uid() then e.fan_id else e.creator_id end,
         p.handle, e.descripcion, coalesce(e.acordado_coins, e.oferta_coins),
         e.estado::text, e.entrega_max, e.clip_id, e.created_at,
         (select count(*)::int from public.custom_request_messages m where m.request_id = e.id)
    from public.custom_requests e
    join public.profiles p on p.id = case when e.creator_id = auth.uid()
                                          then e.fan_id else e.creator_id end
   where auth.uid() in (e.fan_id, e.creator_id)
   order by e.updated_at desc limit 50;
$$;

revoke all on function public.crear_encargo(uuid, text, int, int) from public, anon;
revoke all on function public.responder_encargo(uuid, text, int)  from public, anon;
revoke all on function public.aceptar_encargo(uuid)               from public, anon;
revoke all on function public.pagar_encargo(uuid)                 from public, anon;
revoke all on function public.entregar_encargo(uuid, uuid)        from public, anon;
revoke all on function public.mis_encargos()                      from public, anon;
grant execute on function public.crear_encargo(uuid, text, int, int) to authenticated;
grant execute on function public.responder_encargo(uuid, text, int)  to authenticated;
grant execute on function public.aceptar_encargo(uuid)               to authenticated;
grant execute on function public.pagar_encargo(uuid)                 to authenticated;
grant execute on function public.entregar_encargo(uuid, uuid)        to authenticated;
grant execute on function public.mis_encargos()                      to authenticated;

-- ---------- Blog ----------

create or replace function public.guardar_post(
  p_titulo text, p_cuerpo text, p_visibilidad public.visibilidad_post default 'publico',
  p_publicado boolean default true, p_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); r uuid;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;
  if coalesce(trim(p_titulo),'') = '' then raise exception 'Ponle titulo'; end if;
  if coalesce(trim(p_cuerpo),'')  = '' then raise exception 'El texto no puede ir vacio'; end if;

  if p_id is null then
    insert into public.posts (creator_id, titulo, cuerpo, visibilidad, publicado, publicado_at)
    values (yo, p_titulo, p_cuerpo, p_visibilidad, p_publicado,
            case when p_publicado then now() end)
    returning id into r;
  else
    update public.posts
       set titulo = p_titulo, cuerpo = p_cuerpo, visibilidad = p_visibilidad,
           publicado = p_publicado, updated_at = now(),
           publicado_at = case when p_publicado then coalesce(publicado_at, now()) end
     where id = p_id and creator_id = yo
    returning id into r;
    if r is null then raise exception 'Ese texto no es tuyo'; end if;
  end if;
  return r;
end; $$;

create or replace function public.borrar_post(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.posts where id = p_id and creator_id = auth.uid();
end; $$;

-- Los textos para suscriptoras se recortan a un adelanto: se ve que existen y
-- de que van, pero no se leen. Ocultarlos del todo no vende nada.
create or replace function public.posts_de(creadora uuid)
returns table (id uuid, titulo text, cuerpo text, visibilidad text,
               publicado_at timestamptz, completo boolean)
language sql security definer stable set search_path = '' as $$
  select p.id, p.titulo,
         case when p.visibilidad = 'publico'
                or p.creator_id = auth.uid()
                or exists (select 1 from public.subscriptions s
                            where s.creator_id = p.creator_id
                              and s.subscriber_id = auth.uid()
                              and s.estado = 'activa' and s.periodo_fin > now())
              then p.cuerpo
              else left(p.cuerpo, 240) || '…' end,
         p.visibilidad::text, p.publicado_at,
         (p.visibilidad = 'publico'
           or p.creator_id = auth.uid()
           or exists (select 1 from public.subscriptions s
                       where s.creator_id = p.creator_id
                         and s.subscriber_id = auth.uid()
                         and s.estado = 'activa' and s.periodo_fin > now()))
    from public.posts p
   where p.creator_id = creadora
     and (p.publicado or p.creator_id = auth.uid())
   order by coalesce(p.publicado_at, p.created_at) desc
   limit 50;
$$;

revoke all on function public.guardar_post(text, text, public.visibilidad_post, boolean, uuid) from public, anon;
revoke all on function public.borrar_post(uuid) from public, anon;
grant execute on function public.guardar_post(text, text, public.visibilidad_post, boolean, uuid) to authenticated;
grant execute on function public.borrar_post(uuid) to authenticated;
grant execute on function public.posts_de(uuid) to authenticated, anon;
