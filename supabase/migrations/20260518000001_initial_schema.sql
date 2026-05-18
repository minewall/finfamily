-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 001 — Schema inicial Haile
-- Tabelas: profiles, family_groups, family_members, user_data
-- ═══════════════════════════════════════════════════════════════════

-- ── PROFILES ─────────────────────────────────────────────────────
-- Um perfil por usuário auth.users. Role 'user' por default; 'admin' para operadores.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  tier        text not null default 'free' check (tier in ('free', 'plus', 'premium', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-populate profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── FAMILY GROUPS ─────────────────────────────────────────────────
create table if not exists public.family_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Minha Família',
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create unique index if not exists family_groups_owner_idx on public.family_groups(owner_id);

-- ── FAMILY MEMBERS ────────────────────────────────────────────────
create table if not exists public.family_members (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.family_groups(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  role           text not null default 'member' check (role in ('admin', 'editor', 'member')),
  invited_email  text not null,
  pessoa_name    text,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

create unique index if not exists family_members_email_family_idx
  on public.family_members(family_id, invited_email);

-- ── USER DATA ─────────────────────────────────────────────────────
-- Armazena o blob JSON completo do store (estratégia híbrida).
-- Uma linha por usuário. family_id permite que membros leiam via RLS.
create table if not exists public.user_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  family_id   uuid references public.family_groups(id) on delete set null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_data_updated_at on public.user_data;
create trigger touch_user_data_updated_at
  before update on public.user_data
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();
