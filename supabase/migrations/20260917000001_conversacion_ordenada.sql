-- Corrige admin_mensaje_interno.
--
-- La tabla conversations YA resolvia el problema del par duplicado: guarda
-- (menor, mayor) con check (a_id < b_id) y unique sobre el par, asi que un
-- hilo entre dos personas es unico sin importar quien escribio primero.
--
-- La primera version de esta funcion ignoraba eso, buscaba en las dos
-- direcciones e insertaba en el orden (yo, destino). Cuando mi id era el
-- mayor, la restriccion la rechazaba. La leccion es la de siempre: mirar como
-- lo resuelve el esquema antes de resolverlo otra vez.

create or replace function public.admin_mensaje_interno(
  destino uuid, texto text, campana uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); conv uuid; menor uuid; mayor uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede enviar mensajes de plataforma'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(texto),'') = '' then
    raise exception 'El mensaje no puede ir vacio';
  end if;
  if destino = yo then return jsonb_build_object('ok', true, 'omitido', true); end if;

  menor := least(yo, destino);
  mayor := greatest(yo, destino);

  select c.id into conv from public.conversations c
   where c.a_id = menor and c.b_id = mayor;
  if conv is null then
    insert into public.conversations (a_id, b_id) values (menor, mayor)
    -- Por si dos envios coinciden: el unique es la garantia, esto solo evita
    -- que uno de los dos reviente.
    on conflict (a_id, b_id) do nothing
    returning id into conv;
    if conv is null then
      select c.id into conv from public.conversations c
       where c.a_id = menor and c.b_id = mayor;
    end if;
  end if;

  -- precio_coins 0: un aviso de la plataforma no se cobra.
  insert into public.messages (conversation_id, sender_id, cuerpo, precio_coins)
  values (conv, yo, texto, 0);
  update public.conversations set ultimo_at = now() where id = conv;

  if campana is not null then
    insert into public.campana_destinatarios (campana_id, user_id, ok)
    values (campana, destino, true)
    on conflict (campana_id, user_id) do update set ok = true, error = null;
  end if;

  return jsonb_build_object('ok', true, 'conversacion', conv);
end; $$;
revoke all on function public.admin_mensaje_interno(uuid, text, uuid) from public, anon;
grant execute on function public.admin_mensaje_interno(uuid, text, uuid) to authenticated;
