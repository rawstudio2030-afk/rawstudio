-- Módulo: Integración con redes sociales (X, TikTok)

-- Tabla para almacenar tokens de OAuth de redes sociales
create table if not exists public.redes_sociales_tokens (
  id         uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('x', 'tiktok')),
  access_token text not null,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  conectada_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plataforma)
);
alter table public.redes_sociales_tokens enable row level security;
create policy redes_sociales_tokens_admin on public.redes_sociales_tokens for select to authenticated
  using (public.es_admin());

-- Tabla para guardar historial de posts en redes sociales
create table if not exists public.redes_sociales_posts (
  id         uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('x', 'tiktok')),
  contenido  text not null,
  video_url  text,
  estado     text not null default 'publicado' check (estado in ('borrador', 'programado', 'publicado', 'error')),
  url_plataforma text,
  likes      int default 0,
  compartidas int default 0,
  respuestas int default 0,
  views      int default 0,
  error_mensaje text,
  publicada_por uuid references public.profiles (id),
  programada_para timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.redes_sociales_posts enable row level security;
create policy redes_sociales_posts_admin on public.redes_sociales_posts for select to authenticated
  using (public.es_admin());

-- Función para verificar si hay tokens configurados
create or replace function public.tiene_token_redes(plataforma_name text)
returns boolean
language sql security definer set search_path = '' as $$
  select exists(
    select 1 from public.redes_sociales_tokens
    where plataforma = plataforma_name and public.es_admin()
  )
$$;
