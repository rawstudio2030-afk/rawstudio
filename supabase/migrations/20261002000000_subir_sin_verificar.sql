-- Publicar por una creadora que aun no esta verificada.
--
-- Completa la regla que se dejo a medias: ella podia subir sin verificar
-- porque el clip nace pendiente, pero la administracion no podia subirlo por
-- ella. Con el material ya en mano y el expediente en tramite, eso obligaba a
-- esperar sin ninguna razon: el clip no se publica igual.

create or replace function public.admin_publicar_para(
  creadora uuid, p_titulo text, p_archivo text, p_portada text default null,
  p_precio int default 240, p_visibilidad public.visibilidad_clip default 'pago',
  p_descripcion text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare cid uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede publicar por otra persona'
      using errcode = 'insufficient_privilege';
  end if;
  -- Sin expediente completo no se publica. Es la misma regla que aplica a
  -- cualquier creadora: la diferencia es de dónde salió la constancia.
  -- NO se exige que la creadora este verificada para SUBIR.
  --
  -- Antes esta funcion rechazaba de plano, y eso dejaba la regla a medias: la
  -- creadora podia subir su propio material sin verificar —el clip nace
  -- pendiente— pero la administracion no podia subirlo por ella. Con material
  -- ya en mano y el expediente en tramite, eso obligaba a esperar sin motivo.
  --
  -- Las puertas que importan siguen cerradas y no dependen de esta:
  --   - el disparador de clips lo deja en 'pendiente' si no esta verificada;
  --   - admin_moderar() rechaza aprobar contenido de quien no lo esta;
  --   - el disparador de coin_ledger impide acreditarle un solo coin.
  -- Si al revisar los documentos no cumple, el clip nunca llega a aprobarse.
  if not exists (select 1 from public.expedientes e where e.user_id = creadora) then
    raise exception 'Esa creadora no fue dada de alta por administracion';
  end if;

  insert into public.clips (creator_id, title, description, storage_path, cover_path,
                            visibility, price_coins, published, published_at)
  values (creadora, p_titulo, p_descripcion, p_archivo, p_portada,
          p_visibilidad, case when p_visibilidad = 'pago' then p_precio else 0 end,
          true, now())
  returning id into cid;

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'publicar_para', creadora,
          jsonb_build_object('clip', cid, 'titulo', p_titulo));

  return jsonb_build_object('ok', true, 'clip', cid);
end;
$$;
