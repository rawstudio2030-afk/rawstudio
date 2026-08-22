-- Corrige el blindaje de columnas para que el servidor pueda escribir.
--
-- BUG QUE ARREGLA
-- es_admin() usa auth.uid(), que es NULL cuando quien escribe no es un usuario
-- con sesion: el service_role, una migracion, un trabajo programado. En esos
-- casos el trigger consideraba "no es admin" y revertia identidad_verificada y
-- curp_hash.
--
-- Consecuencia: el microservicio de verificacion habria marcado a alguien como
-- verificada, la base lo habria revertido, y NO habria error. El caso mas
-- dificil de depurar: todo parece funcionar y nada cambia.
create or replace function public.profiles_proteger_columnas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claims text := current_setting('request.jwt.claims', true);
  rol    text := current_setting('request.jwt.claim.role', true);
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

  -- Se protege solo frente a peticiones de usuarios con sesion. Sin claims no
  -- hay peticion de API: es el servidor —service_role, migracion o tarea
  -- programada—, y ese contexto no se alcanza desde el navegador.
  if claims is not null
     and coalesce(rol, claims::json->>'role', '') <> 'service_role'
     and not public.es_admin()
  then
    new.verified                := old.verified;
    new.suspended_at            := old.suspended_at;
    new.suspended_reason        := old.suspended_reason;
    new.identidad_verificada    := old.identidad_verificada;
    new.identidad_verificada_at := old.identidad_verificada_at;
    new.curp_hash               := old.curp_hash;
  end if;

  return new;
end;
$$;
