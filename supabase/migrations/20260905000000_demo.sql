-- Contenido de demostración.
--
-- Existe para que la plataforma no se vea vacia al enseñarla, sin usar a
-- personas reales. Todo lo marcado aqui es ficticio y se puede borrar de un
-- comando.
--
-- La marca es_demo NO es cosmetica: es lo que permite distinguir a simple vista
-- lo inventado de lo real, y vaciarlo antes de abrir al publico sin tocar nada
-- mas. Sin ella, en unas semanas nadie recordaria que perfiles eran de adorno.

alter table public.profiles add column es_demo boolean not null default false;
alter table public.clips    add column es_demo boolean not null default false;

create index profiles_demo_idx on public.profiles (es_demo) where es_demo;
create index clips_demo_idx    on public.clips (es_demo) where es_demo;

comment on column public.profiles.es_demo is
  'Perfil ficticio de demostracion. Se borra con admin_borrar_demo().';

-- ── Sembrar ─────────────────────────────────────────────────────────────────
create or replace function public.admin_sembrar_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  gente jsonb := '[
    {"h":"nocturna","n":"Nocturna","b":"Grabo cuando la ciudad ya se durmió. Una toma, sin cortes."},
    {"h":"vera_cassette","n":"Vera Cassette","b":"Cinta de video y luz de tubo. Lo demás sobra."},
    {"h":"lumen","n":"Lumen","b":"Trabajo con sombras. Lo que no se ve también cuenta."},
    {"h":"ruido_rosa","n":"Ruido Rosa","b":"Ruido, grano y neón. Nada limpio, nada perfecto."},
    {"h":"la_dalia","n":"La Dalia","b":"Retrato lento. Me tardo y no pido perdón."},
    {"h":"eco_del_sur","n":"Eco del Sur","b":"Del sur, de noche, sin prisa."},
    {"h":"kina","n":"Kina","b":"Cámara fija, un solo plano, doce minutos."},
    {"h":"sombra_neon","n":"Sombra Neón","b":"Todo lo grabo en el mismo cuarto. Cambia la luz, no el lugar."}
  ]'::jsonb;
  titulos text[] := array[
    'Cuarto sin ventanas','Última toma de la noche','Rollo 04','Luz de tubo',
    'Nada que declarar','Sesión sin cortes','Cinta encontrada','Doce minutos',
    'Antes del amanecer','Ruido de fondo','Sin título, sin prisa','Grano fino'];
  p jsonb; uid uuid; i int; j int; n int := 0; c int := 0;
  visib public.visibilidad_clip; precio int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede sembrar demostración'
      using errcode = 'insufficient_privilege';
  end if;

  for i in 0 .. jsonb_array_length(gente) - 1 loop
    p := gente -> i;
    uid := gen_random_uuid();

    -- Los perfiles cuelgan de auth.users, asi que hace falta la fila. El correo
    -- usa un dominio reservado para ejemplos (RFC 2606): no existe ni puede
    -- registrarse, asi que no colisiona con nadie real.
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            (p->>'h') || '@demo.example', '', now(), now(), now());

    update public.profiles set
      handle = p->>'h', display_name = p->>'n', bio = p->>'b',
      is_creator = true, es_demo = true, identidad_verificada = true,
      identidad_verificada_at = now(), adult_confirmed_at = now(),
      verified = (i % 3 = 0)
    where id = uid;
    n := n + 1;

    for j in 1 .. (3 + (i % 3)) loop
      -- Mezcla de modalidades para que el catalogo no se vea de un solo tipo.
      visib := case (i + j) % 5
                 when 0 then 'gratis'::public.visibilidad_clip
                 when 1 then 'suscriptores'::public.visibilidad_clip
                 else 'pago'::public.visibilidad_clip end;
      precio := case visib when 'pago' then 60 + ((i + j) % 6) * 40 else 0 end;

      insert into public.clips (creator_id, title, description, visibility,
                                price_coins, published, published_at, es_demo,
                                duration_s, renta_horas, renta_coins)
      values (uid,
              titulos[1 + ((i * 3 + j) % array_length(titulos, 1))],
              'Contenido de demostración. No corresponde a ninguna persona real.',
              visib, precio, true,
              now() - ((i * 7 + j) || ' hours')::interval, true,
              180 + ((i + j) % 9) * 60,
              case when visib = 'pago' and j % 2 = 0 then 48 else null end,
              case when visib = 'pago' and j % 2 = 0 then greatest(20, precio / 3) else null end);
      c := c + 1;
    end loop;
  end loop;

  insert into public.admin_log (admin_id, accion, detalle)
  values (auth.uid(), 'sembrar_demo',
          jsonb_build_object('perfiles', n, 'clips', c));

  return jsonb_build_object('ok', true, 'perfiles', n, 'clips', c);
end;
$$;

-- ── Borrar ──────────────────────────────────────────────────────────────────
create or replace function public.admin_borrar_demo()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar la demostración'
      using errcode = 'insufficient_privilege';
  end if;

  -- Borrar el usuario arrastra el perfil y sus clips por cascada. Se hace asi y
  -- no borrando tablas sueltas para que no queden huerfanos.
  select count(*) into n from public.profiles where es_demo;
  delete from auth.users u
   using public.profiles p
   where p.id = u.id and p.es_demo;

  insert into public.admin_log (admin_id, accion, detalle)
  values (auth.uid(), 'borrar_demo', jsonb_build_object('perfiles', n));

  return jsonb_build_object('ok', true, 'borrados', n);
end;
$$;

revoke all on function public.admin_sembrar_demo() from public, anon;
revoke all on function public.admin_borrar_demo()  from public, anon;
grant execute on function public.admin_sembrar_demo() to authenticated;
grant execute on function public.admin_borrar_demo()  to authenticated;
