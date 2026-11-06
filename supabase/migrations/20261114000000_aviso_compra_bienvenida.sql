-- Tres correos que faltaban: el recibo a quien compra, el aviso de venta a la
-- creadora, y la bienvenida al registrarse.
--
-- ---------- Lo que habia ----------
--
-- Administracion se enteraba de todo —verificaciones, retiros, purgas— y la
-- creadora de dos cosas. Pero el momento central de la plataforma, que
-- alguien PAGUE por algo, no avisaba a nadie: quien compro no recibia ningun
-- comprobante, y quien vendio no se enteraba de que vendio salvo que abriera
-- su monedero por casualidad. Y quien se registraba no recibia nada en
-- absoluto.
--
-- Misma forma que los avisos que ya existen: una columna que dice si ya se
-- aviso, una funcion que devuelve lo pendiente, otra que lo marca DESPUES de
-- que Resend acepto, y un disparador que llama a la funcion de borde al
-- instante por pg_net. Ver 20261108000000 (aviso_creadora).

-- ---------- Compras y rentas ----------

alter table public.purchases add column if not exists avisada_at timestamptz;
alter table public.rentals   add column if not exists avisada_at timestamptz;

comment on column public.purchases.avisada_at is
  'Cuando salieron los dos correos de esta compra: el recibo a quien compro y el aviso de venta a la creadora. Lo escribe la funcion de borde `avisar-compra`.';
comment on column public.rentals.avisada_at is
  'Igual que purchases.avisada_at, para las rentas.';

-- Las compras de antes de hoy se dan por avisadas. Un recibo que llega tres
-- meses despues de pagar no es un recibo: es una confusion.
update public.purchases set avisada_at = created_at where avisada_at is null;
update public.rentals   set avisada_at = created_at where avisada_at is null;

create or replace function public.compras_para_avisar()
returns jsonb
language sql security definer stable set search_path = '' as $$
  with todas as (
    select 'compra' as tipo, p.id, p.clip_id, p.user_id, p.price_coins, p.created_at,
           null::timestamptz as vence
      from public.purchases p where p.avisada_at is null
    union all
    select 'renta', r.id, r.clip_id, r.user_id, r.price_coins, r.created_at, r.vence
      from public.rentals r where r.avisada_at is null
  ),
  pendientes as (
    select t.tipo, t.id, t.price_coins, t.created_at, t.vence,
           c.title as clip_titulo,
           -- Lo que de verdad le queda a la creadora, con la comision de
           -- public.ajustes y no con un 80 escrito a mano.
           t.price_coins - public.comision_de(t.price_coins) as neto,
           coalesce(pc.display_name, pc.handle, '') as comprador,
           uc.email as correo_comprador,
           coalesce(pv.display_name, pv.handle, '') as creadora,
           uv.email as correo_creadora
      from todas t
      join public.clips c on c.id = t.clip_id
      join public.profiles pc on pc.id = t.user_id
      left join auth.users uc on uc.id = t.user_id
      join public.profiles pv on pv.id = c.creator_id
      left join auth.users uv on uv.id = c.creator_id
  )
  select jsonb_build_object(
    'avisos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'tipo', tipo, 'id', id, 'clip', clip_titulo,
               'precio', price_coins, 'neto', neto, 'vence', vence,
               'comprador', comprador, 'correo_comprador', correo_comprador,
               'creadora', creadora, 'correo_creadora', correo_creadora
             ) order by created_at), '[]'::jsonb)
        from pendientes),
    'sin_correo', (select count(*) from pendientes
                    where correo_comprador is null and correo_creadora is null)
  );
$$;

comment on function public.compras_para_avisar is
  'Compras y rentas de las que todavia no se mando ni el recibo ni el aviso de venta. Solo para la funcion de borde `avisar-compra`: devuelve correos.';

create or replace function public.marcar_compra_avisada(avisos jsonb)
returns int
language sql security definer set search_path = '' as $$
  with dichos as (
    select (a->>'id')::uuid as id, a->>'tipo' as tipo
      from jsonb_array_elements(coalesce(avisos, '[]'::jsonb)) a
  ),
  c as (update public.purchases p set avisada_at = now()
          from dichos d where d.tipo = 'compra' and p.id = d.id and p.avisada_at is null
        returning 1),
  r as (update public.rentals x set avisada_at = now()
          from dichos d where d.tipo = 'renta' and x.id = d.id and x.avisada_at is null
        returning 1)
  select (select count(*) from c) + (select count(*) from r);
$$;

comment on function public.marcar_compra_avisada is
  'Marca las compras y rentas cuyos correos ya salieron. Se llama DESPUES de que Resend acepte: si falla el envio, la siguiente pasada la recoge.';

-- ---------- Bienvenida ----------

alter table public.profiles add column if not exists bienvenida_at timestamptz;

comment on column public.profiles.bienvenida_at is
  'Cuando salio el correo de bienvenida. Lo escribe la funcion de borde `avisar-bienvenida`. NO esta en las listas de columnas que lee el cliente, y asi debe seguir.';

-- Las cuentas que ya existen se dan por bienvenidas: a quien lleva meses
-- dentro no se le da la bienvenida.
update public.profiles set bienvenida_at = created_at where bienvenida_at is null;

create or replace function public.bienvenidas_pendientes()
returns jsonb
language sql security definer stable set search_path = '' as $$
  with pendientes as (
    select p.id, coalesce(p.display_name, p.handle, '') as quien, p.is_creator, u.email
      from public.profiles p
      left join auth.users u on u.id = p.id
     where p.bienvenida_at is null
       -- A quien dio de alta administracion no se le da la bienvenida por
       -- aqui: no eligio registrarse, no tiene contraseña, y ese caso tiene
       -- su propio recorrido (el correo de recuperacion).
       and not exists (select 1 from public.expedientes e where e.user_id = p.id)
  )
  select jsonb_build_object(
    'avisos', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', id, 'quien', quien, 'creadora', is_creator, 'correo', email)), '[]'::jsonb)
                 from pendientes where email is not null),
    'sin_correo', (select count(*) from pendientes where email is null)
  );
$$;

create or replace function public.marcar_bienvenida(ids uuid[])
returns int
language sql security definer set search_path = '' as $$
  with t as (update public.profiles set bienvenida_at = now()
              where id = any(ids) and bienvenida_at is null returning 1)
  select count(*)::int from t;
$$;

revoke all on function public.compras_para_avisar() from public, anon, authenticated;
revoke all on function public.marcar_compra_avisada(jsonb) from public, anon, authenticated;
revoke all on function public.bienvenidas_pendientes() from public, anon, authenticated;
revoke all on function public.marcar_bienvenida(uuid[]) from public, anon, authenticated;
grant execute on function public.compras_para_avisar() to service_role;
grant execute on function public.marcar_compra_avisada(jsonb) to service_role;
grant execute on function public.bienvenidas_pendientes() to service_role;
grant execute on function public.marcar_bienvenida(uuid[]) to service_role;

-- ---------- Al instante ----------

create or replace function public.tr_compra_avisa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-compra');
  return null;
end; $$;

drop trigger if exists compra_avisa on public.purchases;
create trigger compra_avisa after insert on public.purchases
  for each row execute function public.tr_compra_avisa();

drop trigger if exists renta_avisa on public.rentals;
create trigger renta_avisa after insert on public.rentals
  for each row execute function public.tr_compra_avisa();

create or replace function public.tr_bienvenida()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.avisar_por_borde('avisar-bienvenida');
  return null;
end; $$;

drop trigger if exists perfil_bienvenida on public.profiles;
create trigger perfil_bienvenida after insert on public.profiles
  for each row execute function public.tr_bienvenida();
