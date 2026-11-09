-- Explorar en orden aleatorio y catalogo completo.
--
-- Hasta hoy Explorar pedia `clipsPublicados(60)`: siempre los mismos 60, en el
-- mismo orden, y el resto del catalogo (~130 clips) no aparecia nunca. Los
-- filtros «gratis» / «de pago» se aplicaban en el navegador sobre esos 60, asi
-- que tampoco llegaban al resto.
--
-- `explorar_ids` devuelve los ids de UNA pagina del catalogo en este orden:
--
--   1. lo destacado primero, en el orden que le puso la administracion
--      (`destacado_orden`, lo no destacado al final);
--   2. el resto, revuelto de forma ESTABLE: md5(semilla || id). Con la misma
--      semilla el orden es identico en todas las paginas (la paginacion no
--      repite ni salta clips); con otra semilla, otro orden. Por eso no hay
--      `order by random()`: cada pagina reordenaria distinto;
--   3. `id`, solo como desempate.
--
-- SECURITY INVOKER a proposito: aplican la politica `clips_select_publicados`
-- (que ya deja fuera a las creadoras baneadas) y los permisos por columna de
-- 20261104000000. Una funcion definer se saltaria ambas. Las columnas que toca
-- (id, published, caduca_at, destacado_orden, visibility) ya tienen
-- `grant select` para `anon`; no se abre ninguna.
--
-- El filtro es el mismo que antes hacia el navegador: `gratis` y `pago`
-- filtran por `visibility`; cualquier otro valor, sin filtro. La caducidad se
-- filtra aqui, como en `clipsPublicados`: un clip pasado de su fecha no sale.
--
-- No devuelve datos: solo ids. El cliente pide las filas con su consulta
-- habitual (con la autora) y las reordena segun estos ids.

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

comment on function public.explorar_ids is
  'Ids de una pagina del catalogo: destacados primero (destacado_orden), luego orden estable por semilla. Security invoker: aplica RLS y permisos por columna.';
