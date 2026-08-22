-- Restriccion geografica del contenido.
--
-- La pagina de creadoras lo promete asi: "Bloqueas tu perfil por pais, estado o
-- ciudad y ahi simplemente no existe". Se implementa POR PAIS.
--
-- Estado y ciudad quedan fuera a proposito: la geolocalizacion por IP a nivel
-- ciudad es poco confiable —falla seguido por cientos de kilometros, sobre todo
-- en moviles— y prometer un bloqueo que no cumple es peor que no ofrecerlo. Es
-- justo el caso donde una creadora confiaria en algo que no la protege.

-- Codigos ISO 3166-1 alfa-2. La validacion va sobre la cadena unida porque
-- Postgres no admite subconsultas dentro de un CHECK.
alter table public.profiles
  add column paises_bloqueados text[] not null default '{}'
    constraint paises_perfil_validos
    check (array_to_string(paises_bloqueados, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');

-- Nulo = hereda el bloqueo del perfil. Arreglo vacio = este clip no bloquea
-- nada, que es distinto de heredar.
alter table public.clips
  add column paises_bloqueados text[]
    constraint paises_clip_validos
    check (paises_bloqueados is null
           or array_to_string(paises_bloqueados, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');

comment on column public.clips.paises_bloqueados is
  'Nulo = hereda del perfil. Arreglo vacio = no bloquea nada.';

create or replace function public.bloqueado_en(clip uuid, pais text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select coalesce(c.paises_bloqueados, p.paises_bloqueados) @> array[upper(pais)]
     from public.clips c join public.profiles p on p.id = c.creator_id
     where c.id = clip),
    false)
$$;

grant execute on function public.bloqueado_en(uuid, text) to authenticated, anon;
