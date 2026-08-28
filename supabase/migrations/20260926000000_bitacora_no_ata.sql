-- La bitacora ya no impide borrar a una persona.
--
-- EL FALLO, Y ES MIO. Al agregar en el Modulo 6 los eventos de alta de cuenta
-- y subida de clip, la bitacora paso a referenciar por clave foranea a
-- CUALQUIER usuario, no solo a los administradores. Como admin_log no tiene
-- accion de borrado en su clave foranea, borrar a una persona empezo a fallar
-- con violacion de integridad.
--
-- No era un detalle de la demostracion: era imposible borrar a NADIE que
-- tuviera historial, o sea a cualquiera que hubiera entrado alguna vez. Una
-- persona que pida que se borre su cuenta tiene derecho a que se borre.
--
-- LA SOLUCION: on delete set null. El evento se queda —quien lo hizo, cuando,
-- desde que IP y con que detalle— y solo se suelta el vinculo con la fila que
-- ya no existe. La bitacora no pierde el registro; pierde el puntero.

alter table public.admin_log alter column admin_id drop not null;

alter table public.admin_log drop constraint if exists admin_log_admin_id_fkey;
alter table public.admin_log add constraint admin_log_admin_id_fkey
  foreign key (admin_id) references public.profiles (id) on delete set null;

alter table public.admin_log drop constraint if exists admin_log_objetivo_fkey;
alter table public.admin_log add constraint admin_log_objetivo_fkey
  foreign key (objetivo) references public.profiles (id) on delete set null;

comment on column public.admin_log.admin_id is
  'Quien hizo la accion. Queda en nulo si esa cuenta se borro despues: el evento sobrevive a la persona, que es justo lo que se le pide a una bitacora.';

-- El disparador de inmutabilidad tiene que dejar pasar ESE caso y solo ese.
-- Sin la excepcion, la accion de la clave foranea es un UPDATE y el disparador
-- la rechaza, con lo que seguiriamos sin poder borrar a nadie.
create or replace function public.bitacora_inmutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     -- Unica edicion permitida: soltar el vinculo con una cuenta borrada.
     -- Todo lo demas del evento debe quedar exactamente igual.
     and (new.admin_id is null or new.objetivo is null)
     and new.id         is not distinct from old.id
     and new.accion     is not distinct from old.accion
     and new.detalle    is not distinct from old.detalle
     and new.ip         is not distinct from old.ip
     and new.created_at is not distinct from old.created_at
     and (new.admin_id is null or new.admin_id = old.admin_id)
     and (new.objetivo is null or new.objetivo = old.objetivo)
  then
    return new;
  end if;

  raise exception 'La bitacora no se edita ni se borra (intento de % sobre admin_log)', tg_op
    using errcode = 'insufficient_privilege';
end; $$;
