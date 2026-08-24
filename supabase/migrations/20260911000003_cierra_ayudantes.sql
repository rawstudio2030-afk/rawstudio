-- Los ayudantes de IP y pais son de uso interno: los llaman otras funciones
-- del servidor, no la aplicacion. Se cierran a anon para no dejar expuesta
-- una llamada que nadie necesita desde fuera.
--
-- Comprobado contra falsificacion: pedir la IP poniendo a mano CF-Connecting-IP
-- hace que Cloudflare rechace la peticion completa (error 1000), y poner
-- X-Forwarded-For a mano no cambia el resultado porque Cloudflare lo
-- sobrescribe. La direccion que se guarda es la real.
revoke all on function public.ip_solicitante()   from public, anon;
revoke all on function public.pais_solicitante() from public, anon;
grant execute on function public.ip_solicitante()   to authenticated;
grant execute on function public.pais_solicitante() to authenticated;
