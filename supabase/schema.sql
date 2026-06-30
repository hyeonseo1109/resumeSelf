create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  mode text not null check (mode in ('template', 'free')),
  navigation_mode text not null default 'scroll' check (navigation_mode in ('router', 'scroll')),
  navigation jsonb not null default '[]'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.fonts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  family text not null,
  source_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.media enable row level security;
alter table public.fonts enable row level security;

create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can manage own projects" on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Published projects are readable" on public.projects
  for select using (published_at is not null or auth.uid() = owner_id);

create policy "Users can manage own media" on public.media
  for all using (
    exists (select 1 from public.projects where projects.id = media.project_id and projects.owner_id = auth.uid())
  );

