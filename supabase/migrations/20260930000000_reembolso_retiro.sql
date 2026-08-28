-- Reembolso automatico cuando una creadora retira algo ya vendido.
--
-- POR QUE EL RETIRO TOTAL SE QUEDA. En una plataforma de contenido adulto, el
-- derecho a retirar el consentimiento tiene que poder mas que una venta. Si
-- alguien es expuesta, coaccionada o deja el oficio, "es que alguien lo pago"
-- no puede ser el motivo de que su contenido siga publicado. Los terminos ya
-- lo advierten: "Si la creadora lo retira o su cuenta se cancela, el acceso
-- puede terminar".
--
-- LO QUE FALTABA era que el comprador no quedara perjudicado. Ahora recupera
-- sus coins con un boton, sin tener que escribirle a nadie ni esperar a que
-- alguien revise una cola.
--
-- SE COBRA A LA CREADORA lo que se le abono, no el precio completo: la
-- comision se la quedo la plataforma y devolverla de su bolsillo seria
-- cobrarle dos veces. La plataforma asume su parte.

create table if not exists public.reembolsos_retiro (
  clip_id uuid not null references public.clips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  coins   int  not null,
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id)
);
alter table public.reembolsos_retiro enable row level security;
create policy reembolsos_leer on public.reembolsos_retiro for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

create or replace function public.reembolso_disponible(clip uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.price_coins from public.purchases p, public.clips c
     where p.clip_id = clip and p.user_id = auth.uid() and c.id = clip
       and c.caduca_at is not null and c.caduca_at <= now()
       and c.caduca_modo = 'retiro_total'
       and not exists (select 1 from public.reembolsos_retiro r
                        where r.clip_id = clip and r.user_id = auth.uid())
     limit 1), 0);
$$;

create or replace function public.reclamar_reembolso(clip uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := auth.uid(); precio int; duenia uuid; a_ella int;
begin
  if yo is null then raise exception 'Hay que entrar' using errcode='insufficient_privilege'; end if;

  select p.price_coins, c.creator_id into precio, duenia
    from public.purchases p join public.clips c on c.id = p.clip_id
   where p.clip_id = clip and p.user_id = yo
     and c.caduca_at is not null and c.caduca_at <= now()
     and c.caduca_modo = 'retiro_total';
  if precio is null then
    raise exception 'No hay nada que devolverte por este clip';
  end if;
  if exists (select 1 from public.reembolsos_retiro r
              where r.clip_id = clip and r.user_id = yo) then
    raise exception 'Ya se te devolvio lo de este clip';
  end if;
  if precio = 0 then
    insert into public.reembolsos_retiro (clip_id, user_id, coins) values (clip, yo, 0);
    return jsonb_build_object('ok', true, 'coins', 0);
  end if;

  a_ella := precio - public.comision_de(precio);

  -- Dos asientos: entra a quien pago y sale de quien cobro. La diferencia
  -- —la comision— la absorbe la plataforma, que es quien se la quedo.
  insert into public.coin_ledger (user_id, delta, motivo, ref_id, creado_por, nota)
  values (yo,     precio,   'reembolso', clip, yo, 'Retirado por la creadora'),
         (duenia, -a_ella,  'reembolso', clip, yo, 'Retiro de contenido vendido');

  insert into public.reembolsos_retiro (clip_id, user_id, coins) values (clip, yo, precio);

  insert into public.admin_log (admin_id, accion, objetivo, detalle)
  values (yo, 'reembolso_por_retiro', duenia,
          jsonb_build_object('clip', clip, 'coins', precio, 'a_la_creadora', a_ella));

  return jsonb_build_object('ok', true, 'coins', precio);
end; $$;

revoke all on function public.reembolso_disponible(uuid) from public, anon;
revoke all on function public.reclamar_reembolso(uuid)   from public, anon;
grant execute on function public.reembolso_disponible(uuid) to authenticated;
grant execute on function public.reclamar_reembolso(uuid)   to authenticated;

-- El disparador de verificacion no debe estorbar un reembolso: sacarle coins
-- a una creadora no es acreditarselos.
comment on function public.reclamar_reembolso is
  'Devuelve al comprador lo que pago por un clip que la creadora retiro por completo. Se le cobra a ella lo que se le abono, no el precio con comision: esa se la quedo la plataforma y devolverla de su bolsillo seria cobrarle dos veces.';
