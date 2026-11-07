-- Miniaturas de las fotos de un album.
--
-- La cuadricula del visor usaba la foto completa (~1 MB) para cada mosaico: abrir
-- un album de 40 fotos en un telefono bajaba ~18 MB solo para ver miniaturas. Cada
-- foto guarda ahora una miniatura de ~480 px (decenas de KB) junto a la original;
-- la cuadricula usa la chica y la vista ampliada la grande.
--
-- Va en el MISMO bucket y en la MISMA carpeta del album: <autora>/<album>/mini/<n>.jpg.
-- Asi las politicas de escritura (que miran las dos primeras carpetas) siguen
-- valiendo tal cual, y la de lectura solo necesita reconocer tambien esta ruta.
--
-- `ruta_mini` es OPCIONAL: un album sin miniaturas se sigue viendo (el visor cae
-- a la foto grande), asi nada de lo ya subido se rompe.

alter table public.album_fotos add column if not exists ruta_mini text;

comment on column public.album_fotos.ruta_mini is
  'Miniatura de ~480 px en el bucket «albumes»: <autora>/<album>/mini/<n>.jpg. Opcional.';

-- La miniatura tambien tiene que estar dentro de la carpeta de SU album.
create or replace function public.album_fotos_reglas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare autora uuid; cuantas int;
begin
  select c.creator_id into autora from public.clips c where c.id = new.clip_id;
  if new.ruta not like autora::text || '/' || new.clip_id::text || '/%' then
    raise exception 'La foto tiene que estar en la carpeta de su album';
  end if;
  if new.ruta_mini is not null
     and new.ruta_mini not like autora::text || '/' || new.clip_id::text || '/mini/%' then
    raise exception 'La miniatura tiene que estar en la carpeta mini de su album';
  end if;
  select count(*) into cuantas from public.album_fotos f where f.clip_id = new.clip_id;
  if cuantas >= public.ajuste_int('album_max_fotos', 40) then
    raise exception 'Un album admite como maximo % fotos', public.ajuste_int('album_max_fotos', 40);
  end if;
  return new;
end; $$;

-- Leer: la foto O su miniatura, con la misma regla de acceso.
alter policy albumes_leer on storage.objects
  using (bucket_id = 'albumes' and exists (
    select 1 from public.album_fotos f
     where (f.ruta = objects.name or f.ruta_mini = objects.name)
       and public.tiene_acceso(f.clip_id, auth.uid())));
