-- Descripcion generica para los videos que no tienen ninguna.
--
-- La descripcion casi siempre va vacia (la subida en lote no la pide y en el formulario
-- es opcional) y solo se lee en la ficha del clip. Los videos sin descripcion pasan a
-- «Video de {nombre}», con el `display_name` de la creadora o, si no hay, su `handle`.
--
-- A PROPOSITO NO DICE DE QUE VA EL VIDEO: no se inventa una sinopsis, no hay adjetivos
-- sexuales, no se llama a ninguna API ni se le manda el video a una IA para narrarlo
-- (es contenido 18+). Tampoco asume genero: no usa «creadora» ni «creador».
--
-- QUE SE TOCA: videos (`formato` video o nulo) cuya descripcion es nula, vacia o solo
-- espacios, que NO estan borrados y cuya creadora no esta anonimizada (no se escribe
-- «Video de Cuenta eliminada»).
-- QUE NO: cualquier descripcion que YA tenga texto (la del formulario, la del CSV o una
-- escrita antes), los albumes, los clips borrados y el `title` (el titulo que sale del
-- nombre del archivo se queda como esta).
--
-- IDEMPOTENTE: despues de correrla ningun video queda sin descripcion, asi que la
-- segunda vez el `where` no encuentra nada. Tope de 600 caracteres, como el `check` de la
-- columna.

update public.clips c
   set description = left('Video de ' || coalesce(nullif(btrim(p.display_name), ''), p.handle), 600)
  from public.profiles p
 where p.id = c.creator_id
   and coalesce(c.formato, 'video') = 'video'
   and c.borrado_at is null
   and p.anonimizada_at is null
   and nullif(btrim(coalesce(c.description, '')), '') is null;
