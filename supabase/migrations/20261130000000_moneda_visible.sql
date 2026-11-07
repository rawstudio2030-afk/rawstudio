-- Como se muestra el dinero: dolares, con el equivalente en pesos al lado.
--
-- Todo se sigue GUARDANDO y COBRANDO en dolares (centavos de dolar, la unidad de
-- `*_coins`), que es lo que promete el centro de ayuda. Esto solo agrega una
-- ayuda visual: junto a cada monto puede salir el equivalente aproximado en
-- pesos, calculado con `tipo_cambio_usd_mxn`, el mismo que ya se usa para
-- convertir los retiros. Es informativo: lo que se cobra es el monto en dolares.
--
-- Un interruptor de administracion (`mostrar_equivalente_pesos`) lo enciende o
-- apaga sin publicar nada. Si no hay tipo de cambio definido, no se muestra,
-- aunque el interruptor este encendido: nunca se inventa una cifra.
--
-- La funcion es publica (la ven incluso quienes no han entrado): el tipo de
-- cambio no es un secreto y el centro de ayuda ya lo menciona.

insert into public.ajustes (clave, valor, nota) values
  ('mostrar_equivalente_pesos', 'true'::jsonb,
   'Si se enciende, junto a cada monto en dolares se muestra el equivalente aproximado en pesos, con tipo_cambio_usd_mxn. Es solo informativo: lo que se cobra son los dolares. Sin tipo de cambio definido no se muestra.')
on conflict (clave) do nothing;

create or replace function public.config_moneda()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'mostrar_pesos',
      coalesce((select (a.valor)::text = 'true' from public.ajustes a
                 where a.clave = 'mostrar_equivalente_pesos'), false),
    'tipo_cambio', public.tipo_cambio_usd_mxn());
$$;
revoke all on function public.config_moneda() from public;
grant execute on function public.config_moneda() to anon, authenticated;
