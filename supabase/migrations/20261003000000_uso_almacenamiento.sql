-- Cuanto espacio se esta usando.
--
-- Existe porque Supabase NO avisa antes de llegar al limite: la subida
-- simplemente falla cuando ya no cabe, y con archivos de 20 MB eso significa
-- enterarse despues de esperar la transferencia completa.
--
-- El limite se guarda como ajuste y no se adivina: depende del plan
-- contratado, y suponerlo seria dar una tranquilidad falsa o una alarma
-- inventada.

insert into public.ajustes (clave, valor, nota) values
  ('limite_almacenamiento_mb', '1024'::jsonb,
   'Cuantos MB de almacenamiento incluye tu plan de Supabase. El gratuito son 1024 (1 GB); Pro son 102400 (100 GB). Se usa solo para avisar antes de chocar: cambiarlo aqui NO cambia tu plan.')
on conflict (clave) do nothing;

create or replace function public.admin_uso_almacenamiento()
returns table (
  bucket text, archivos bigint, bytes bigint,
  total_bytes bigint, base_bytes bigint, limite_mb int
)
language sql security definer stable set search_path = '' as $$
  select b.id::text,
         coalesce(x.n, 0),
         coalesce(x.s, 0),
         (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
         pg_database_size(current_database()),
         coalesce((select (valor)::text::int from public.ajustes
                    where clave = 'limite_almacenamiento_mb'), 1024)
    from storage.buckets b
    left join (
      select bucket_id, count(*) n, sum((metadata->>'size')::bigint) s
        from storage.objects group by bucket_id
    ) x on x.bucket_id = b.id
   where public.es_admin()
   order by coalesce(x.s, 0) desc;
$$;
revoke all on function public.admin_uso_almacenamiento() from public, anon;
grant execute on function public.admin_uso_almacenamiento() to authenticated;

-- Lo que ocupa cada creadora, para saber a quien pedirle que depure.
create or replace function public.admin_uso_por_creadora()
returns table (id uuid, handle text, nombre text, clips bigint, bytes bigint)
language sql security definer stable set search_path = '' as $$
  select p.id, p.handle, p.display_name,
         count(*) filter (where c.id is not null),
         coalesce(sum((o.metadata->>'size')::bigint), 0)
    from public.profiles p
    join public.clips c on c.creator_id = p.id
    join storage.objects o
      on o.bucket_id = 'clips' and o.name = c.storage_path
   where public.es_admin()
   group by p.id, p.handle, p.display_name
   having coalesce(sum((o.metadata->>'size')::bigint), 0) > 0
   order by sum((o.metadata->>'size')::bigint) desc
   limit 30;
$$;
revoke all on function public.admin_uso_por_creadora() from public, anon;
grant execute on function public.admin_uso_por_creadora() to authenticated;
