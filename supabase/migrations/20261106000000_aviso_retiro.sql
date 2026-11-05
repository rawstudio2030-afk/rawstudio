-- Avisar por correo cuando alguien pide un retiro.
--
-- El circuito de retiro esta completo desde el 31 de octubre de 2026: la
-- creadora registra su cuenta en /estudio/cobro, pide el retiro en
-- /estudio/retirar, y el modulo Retiros del panel aprueba, calcula las
-- retenciones y marca como pagado con la referencia del SPEI.
--
-- Lo que faltaba es lo mismo que faltaba en la purga: el aviso solo existe
-- dentro del panel. Aqui importa mas, porque al otro lado hay una persona
-- esperando dinero suyo. Un retiro que nadie ve durante una semana no es un
-- descuido de mantenimiento, es un impago.
--
-- ---------- Por que `avisado_at` y no un contador ----------
--
-- La purga se avisa con un contador de lo vencido: da igual cuantas veces se
-- repita, es la misma tarea. Un retiro no: cada solicitud es un evento con su
-- persona y su importe, y hay que avisar UNA vez de CADA una. Si se avisara
-- "hay 3 pendientes" cada dos horas, el correo se volveria ruido y acabaria
-- en la carpeta de siempre.
--
-- Marcar la fila es ademas lo que hace que la funcion de borde pueda ser
-- llamada por cualquiera sin consecuencias: como mucho adelanta un correo que
-- iba a salir igual, y nunca lo duplica.
--
-- ---------- Lo que el correo NO lleva ----------
--
-- Ni CLABE, ni RFC, ni titular. El correo dice quien y cuanto, y manda al
-- panel. Los datos bancarios ya viven en `solicitudes_retiro` detras de RLS y
-- de la sesion de administracion; copiarlos a un buzon de Gmail los saca de
-- ahi para siempre, los deja en los servidores de Resend de paso, y no hacen
-- falta para decidir si abrir el panel.

alter table public.solicitudes_retiro
  add column if not exists avisado_at timestamptz;

comment on column public.solicitudes_retiro.avisado_at is
  'Cuando se mando el correo de aviso de esta solicitud. Null = todavia no. Lo escribe la funcion de borde `avisar-retiro`; sirve para avisar una sola vez por solicitud.';

-- ---------- Que hay que avisar ----------

create or replace function public.retiro_pendiente()
returns jsonb
language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    -- Solo las que no se han avisado. Las demas ya salieron en un correo.
    'nuevas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', s.id,
               'coins', s.coins,
               'quien', coalesce(p.display_name, p.handle, 'una creadora'),
               'handle', p.handle,
               'pedido_at', s.created_at) order by s.created_at), '[]'::jsonb)
        from public.solicitudes_retiro s
        left join public.profiles p on p.id = s.creator_id
       where s.estado = 'pendiente' and s.avisado_at is null),

    -- Cuantas hay sin resolver en total, avisadas o no. Va en el correo
    -- porque "esta es la cuarta que se acumula" es informacion distinta de
    -- "ha llegado una".
    'pendientes_total', (
      select count(*) from public.solicitudes_retiro where estado = 'pendiente'),

    -- Centavos de peso por DOLAR: 1850 = 18.50 MXN/USD. Es el ajuste
    -- `tipo_cambio_usd_mxn`, no el viejo `valor_coin_mxn`, que quedo obsoleto
    -- en octubre de 2026 cuando la economia interna paso a contarse en
    -- dolares; `admin_resolver_retiro` lee este. Si es null, aprobar falla, y
    -- vale mas decirlo en el correo que dejar que lo descubra al pulsar el
    -- boton con la creadora esperando.
    'tipo_de_cambio', to_jsonb(public.tipo_cambio_usd_mxn()),

    'admins', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'correo', u.email,
               'nombre', coalesce(p.display_name, p.handle, 'administración'))), '[]'::jsonb)
        from public.admins a
        join auth.users u on u.id = a.user_id
        left join public.profiles p on p.id = a.user_id
       where u.email is not null)
  );
$$;

comment on function public.retiro_pendiente is
  'Las solicitudes de retiro que todavia no se han avisado, mas el total pendiente y a quien avisar. Solo para la funcion de borde `avisar-retiro`: devuelve correos de administracion, que son datos personales.';

-- ---------- Dar por avisadas ----------

create or replace function public.marcar_retiros_avisados(ids uuid[])
returns int
language sql security definer set search_path = '' as $$
  with tocadas as (
    update public.solicitudes_retiro
       set avisado_at = now()
     where id = any(ids) and avisado_at is null
    returning 1)
  select count(*)::int from tocadas;
$$;

comment on function public.marcar_retiros_avisados is
  'Marca como avisadas las solicitudes indicadas. Se llama DESPUES de que Resend acepte el correo, no antes: si falla el envio, la solicitud sigue sin avisar y el siguiente intento la recoge.';

-- Ninguna de las dos se llama desde el navegador. La de lectura devuelve
-- correos de administracion y la de escritura marca filas de una tabla que
-- ni siquiera es escribible por `authenticated`.
revoke all on function public.retiro_pendiente() from public, anon, authenticated;
revoke all on function public.marcar_retiros_avisados(uuid[]) from public, anon, authenticated;
grant execute on function public.retiro_pendiente() to service_role;
grant execute on function public.marcar_retiros_avisados(uuid[]) to service_role;
