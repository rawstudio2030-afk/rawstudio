-- Configuracion publica de los albumes, para que la pantalla de subida sepa si
-- se ofrecen y con que reglas (precio, minimo y maximo de fotos).
--
-- Es solo LECTURA y no revela nada que no se vea en la propia pantalla. Mientras
-- `albumes_activos` este apagado, `activos` es falso y la opcion no aparece.

create or replace function public.config_albumes()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'activos', public.ajuste_bool('albumes_activos'),
    'precio',  public.ajuste_int('album_precio_coins', 500),
    'min',     public.ajuste_int('album_min_fotos', 10),
    'max',     public.ajuste_int('album_max_fotos', 40));
$$;
revoke all on function public.config_albumes() from public, anon;
grant execute on function public.config_albumes() to authenticated;
