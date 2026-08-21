-- Corrige recursion infinita en la politica de lectura de public.admins.
--
-- La version anterior preguntaba "¿eres admin?" con un subselect sobre la
-- propia tabla admins. Eso vuelve a disparar la politica de admins, que vuelve
-- a consultarla: Postgres corta con 42P17 y la tabla queda ilegible para todos.
--
-- es_admin() es security definer, o sea que corre con los permisos de su dueño
-- —que es dueño de la tabla y por tanto no pasa por RLS—, asi que rompe el
-- ciclo. Regla general para este esquema: una politica sobre una tabla nunca
-- debe consultar esa misma tabla directamente.
drop policy if exists admins_select_solo_admins on public.admins;

create policy admins_select_solo_admins
  on public.admins for select
  to authenticated
  using (public.es_admin());
