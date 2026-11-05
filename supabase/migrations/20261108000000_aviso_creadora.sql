-- Avisarle A ELLA cuando su retiro se mueve.
--
-- Su pantalla le promete «Solicitud enviada. Te avisamos en cuanto se
-- resuelva» desde el 18 de septiembre de 2026, y hasta hoy no existia ningun
-- correo hacia ella: ni al aprobar, ni al pagar, ni al rechazar. Si no volvia
-- a entrar a mirar el historial, no se enteraba. Una promesa escrita en la
-- pantalla de alguien que espera dinero suyo no es un detalle de cortesia.
--
-- Y hay una segunda cosa que no veia en ningun sitio: CUANTOS PESOS va a
-- recibir. La pantalla le habla en dolares —los que pidio— y dice «con las
-- retenciones ya calculadas», pero el numero calculado no aparece. El dia que
-- le llegara la transferencia con el ISR y el IVA descontados seria una
-- sorpresa. Este correo lo dice antes.
--
-- ---------- Por que una columna de estado y no una de fecha ----------
--
-- `avisar-retiro` usa `avisado_at`, una fecha, porque a quien administra se le
-- avisa UNA vez por solicitud: la noticia es «ha llegado una».
--
-- A ella hay que avisarle TRES veces como mucho, y son tres noticias
-- distintas: «lo aprobamos y te toca esto», «ya salio, esta es la
-- referencia», «no se aprobo, y por esto». Una fecha no distingue de que se
-- le aviso. Asi que se guarda EL ESTADO del que se le aviso, y se le avisa
-- cuando el estado de la solicitud ya no es el mismo.
--
-- Eso tiene una propiedad que vale la pena: se colapsa solo. Si alguien
-- aprueba y paga en el mismo rato, entre dos pasadas del cron, ella recibe un
-- unico correo —el de «ya te lo mandamos»— y no dos seguidos. La noticia
-- nueva reemplaza a la vieja en vez de sumarse.
--
-- ---------- Lo que el correo NO lleva ----------
--
-- Ni su CLABE, ni su RFC, ni su titular. Son suyos y ya los conoce; meterlos
-- en un correo solo los copia a un buzon mas y a los servidores de Resend de
-- paso, sin que nadie gane nada. La referencia del SPEI si va: es lo que
-- necesita para reclamar en su banco si el dinero no aparece.

alter table public.solicitudes_retiro
  add column if not exists avisada_estado public.estado_retiro;

comment on column public.solicitudes_retiro.avisada_estado is
  'De que estado se le aviso A LA CREADORA por correo. Null = de ninguno. Lo escribe la funcion de borde `avisar-creadora`. Se le avisa cuando `estado` ya no coincide con esto.';

-- ---------- Que hay que avisarle ----------

create or replace function public.retiro_para_avisar_creadora()
returns jsonb
language sql security definer stable set search_path = '' as $$
  with pendientes as (
    select s.id, s.coins, s.estado, s.motivo_rechazo, s.resuelta_at,
           coalesce(p.display_name, p.handle, '') as quien,
           u.email,
           d.bruto_mxn, d.isr_mxn, d.iva_ret_mxn, d.neto_mxn, d.spei_ref
      from public.solicitudes_retiro s
      join public.profiles p on p.id = s.creator_id
      left join auth.users u on u.id = s.creator_id
      left join public.payouts d on d.id = s.payout_id
     -- Solo lo resuelto: de 'pendiente' no se avisa, que ya lo sabe porque
     -- acaba de pulsar el boton.
     where s.estado <> 'pendiente'
       and (s.avisada_estado is null or s.avisada_estado <> s.estado)
  )
  select jsonb_build_object(
    'avisos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', id, 'coins', coins, 'estado', estado::text,
               'quien', quien, 'correo', email,
               'motivo_rechazo', motivo_rechazo,
               'bruto_mxn', bruto_mxn, 'isr_mxn', isr_mxn,
               'iva_ret_mxn', iva_ret_mxn, 'neto_mxn', neto_mxn,
               'spei_ref', spei_ref) order by resuelta_at), '[]'::jsonb)
        from pendientes where email is not null),

    -- Las que no se pueden avisar nunca porque no hay direccion. Se cuentan
    -- aparte en vez de devolverlas: si viajaran en la lista, cada pasada del
    -- cron fallaria y el trabajo quedaria en rojo para siempre por algo que no
    -- se arregla reintentando. Asi el numero se ve en el registro y nadie se
    -- acostumbra a un rojo permanente.
    'sin_correo', (select count(*) from pendientes where email is null)
  );
$$;

comment on function public.retiro_para_avisar_creadora is
  'Los retiros resueltos de los que todavia no se le ha avisado a la creadora, con su correo y el desglose del pago. Solo para la funcion de borde `avisar-creadora`: devuelve correos y cantidades de personas.';

-- ---------- Darlas por avisadas ----------

create or replace function public.marcar_creadora_avisada(avisos jsonb)
returns int
language sql security definer set search_path = '' as $$
  with dichos as (
    select (a->>'id')::uuid as id,
           (a->>'estado')::public.estado_retiro as estado
      from jsonb_array_elements(coalesce(avisos, '[]'::jsonb)) a
  ),
  tocadas as (
    update public.solicitudes_retiro s
       set avisada_estado = d.estado
      from dichos d
     where s.id = d.id
       -- Solo hacia adelante. El enum esta declarado en el orden en que
       -- ocurren las cosas (pendiente, aprobada, pagada, rechazada), asi que
       -- comparar con `<` impide que una pasada lenta sobreescriba lo que ya
       -- escribio una rapida y provoque un correo repetido.
       and (s.avisada_estado is null or s.avisada_estado < d.estado)
    returning 1)
  select count(*)::int from tocadas;
$$;

comment on function public.marcar_creadora_avisada is
  'Marca de que estado se le aviso a la creadora. Se llama DESPUES de que Resend acepte el correo: si falla el envio, la solicitud sigue sin avisar y la siguiente pasada la recoge. Solo avanza, nunca retrocede.';

-- Ninguna de las dos se llama desde el navegador. La de lectura devuelve
-- correos y cantidades de dinero de terceras personas.
revoke all on function public.retiro_para_avisar_creadora() from public, anon, authenticated;
revoke all on function public.marcar_creadora_avisada(jsonb) from public, anon, authenticated;
grant execute on function public.retiro_para_avisar_creadora() to service_role;
grant execute on function public.marcar_creadora_avisada(jsonb) to service_role;
