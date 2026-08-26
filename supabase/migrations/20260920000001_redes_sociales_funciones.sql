-- Funciones RPC para publicar en redes sociales

create or replace function public.admin_publicar_en_x(
  p_contenido text,
  p_video_url text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
  declare
    v_post_id uuid;
    v_admin_id uuid;
  begin
    if not public.es_admin() then
      raise exception 'Solo administradores pueden publicar';
    end if;

    select auth.uid() into v_admin_id;

    -- Crear registro del post
    insert into public.redes_sociales_posts (
      plataforma, contenido, video_url, estado, publicada_por
    ) values (
      'x', p_contenido, p_video_url, 'publicando', v_admin_id
    ) returning id into v_post_id;

    -- La publicación real se hace en una Edge Function por razones de seguridad
    -- (el Bearer Token no puede estar en la base de datos en texto plano)

    return v_post_id;
  end;
$$;

create or replace function public.admin_publicar_en_tiktok(
  p_contenido text,
  p_video_url text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
  declare
    v_post_id uuid;
    v_admin_id uuid;
  begin
    if not public.es_admin() then
      raise exception 'Solo administradores pueden publicar';
    end if;

    select auth.uid() into v_admin_id;

    -- Crear registro del post
    insert into public.redes_sociales_posts (
      plataforma, contenido, video_url, estado, publicada_por
    ) values (
      'tiktok', p_contenido, p_video_url, 'publicando', v_admin_id
    ) returning id into v_post_id;

    return v_post_id;
  end;
$$;
