-- Tira de fotogramas para la vista previa al pasar el mouse.
--
-- No se reproduce el video: vive en un bucket privado y solo se entrega URL
-- firmada a quien tiene acceso. Previsualizarlo seria regalar lo que se cobra.
-- En su lugar se guarda UNA imagen con seis cuadros apilados, en el bucket
-- publico de portadas, y la tarjeta los recorre con background-position.
alter table public.clips add column if not exists preview_path text;

comment on column public.clips.preview_path is
  'Imagen con seis fotogramas apilados, en el bucket publico clip-covers. Se anima al pasar el mouse. Es un adelanto, no el contenido: seis cuadros no son el video.';

create or replace function public.admin_fijar_preview(clip uuid, ruta text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare duenia uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador' using errcode = 'insufficient_privilege';
  end if;
  update public.clips set preview_path = ruta where id = clip
  returning creator_id into duenia;
  if duenia is null then raise exception 'Ese clip no existe'; end if;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.admin_fijar_preview(uuid, text) from public, anon;
grant execute on function public.admin_fijar_preview(uuid, text) to authenticated;
