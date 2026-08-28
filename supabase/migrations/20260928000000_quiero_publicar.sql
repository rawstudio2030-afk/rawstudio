-- Devuelve la casilla "quiero publicar" a quien se registra.
--
-- REGRESION MIA. Al construir el Modulo 1 blinde is_creator con este
-- comentario: "Nadie en el cliente lo escribe; la unica via legitima es
-- admin_marcar_creadora()". Esa afirmacion era FALSA: la pantalla de perfil lo
-- escribe, y es justo la casilla con la que alguien se da de alta como
-- creadora. La casilla seguia ahi, el guardado no fallaba y el valor se
-- revertia en silencio, que es la peor forma de romper algo.
--
-- POR QUE SE PUEDE DESBLINDAR SIN ABRIR UN HUECO. is_creator no da permiso
-- para publicar ni para cobrar, solo abre el estudio y deja SUBIR:
--   - el clip nace 'pendiente' si la creadora no esta verificada;
--   - admin_moderar() rechaza aprobar contenido de quien no lo esta;
--   - el disparador de coin_ledger impide acreditarle un solo coin.
-- Las tres puertas siguen cerradas y ninguna depende de esta columna. El
-- embudo correcto es: se registra, declara que quiere publicar, se verifica,
-- y hasta entonces publica.
--
-- Se permite SOLO sobre el propio perfil. Marcar creadora a otra persona sigue
-- siendo exclusivo de admin_marcar_creadora().

create or replace function public.profiles_proteger_columnas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  claims text := current_setting('request.jwt.claims', true);
  rol    text := current_setting('request.jwt.claim.role', true);
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();

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
    new.documento_hash          := old.documento_hash;
    new.suspendido_hasta        := old.suspendido_hasta;
    new.baneado_at              := old.baneado_at;
    new.baneado_motivo          := old.baneado_motivo;

    -- is_creator: cada quien decide sobre SI MISMA. Sobre otra persona, no.
    -- Y una cuenta suspendida o baneada no se reabre camino declarandose
    -- creadora.
    if new.id is distinct from auth.uid()
       or old.suspended_at is not null
       or old.baneado_at is not null
    then
      new.is_creator := old.is_creator;
    end if;
  end if;

  return new;
end; $$;
