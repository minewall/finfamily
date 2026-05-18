-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 002 — Row Level Security
-- Policies are intentionally simple (no cross-table lookups that
-- could cause recursion). Admin operations are handled exclusively
-- by the admin edge function with service role key (bypasses RLS).
-- ═══════════════════════════════════════════════════════════════════

-- ── HELPER FUNCTION ──────────────────────────────────────────────
-- security definer: runs as function owner, not caller — safe for RLS
create or replace function public.is_family_owner(fam_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_groups
    where id = fam_id and owner_id = auth.uid()
  );
$$;

-- ── PROFILES ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- ── FAMILY GROUPS ─────────────────────────────────────────────────
alter table public.family_groups enable row level security;

create policy "family_groups: owner all"
  on public.family_groups for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── FAMILY MEMBERS ────────────────────────────────────────────────
alter table public.family_members enable row level security;

-- Owner gerencia membros via is_family_owner (queries family_groups only — no recursion)
create policy "family_members: owner all"
  on public.family_members for all
  using (is_family_owner(family_id))
  with check (is_family_owner(family_id));

-- Membro vê os próprios registros (por user_id ou email do JWT — sem subquery em auth.users)
create policy "family_members: self read"
  on public.family_members for select
  using (
    user_id = auth.uid()
    or (auth.jwt() ->> 'email') = invited_email
  );

-- Membro aceita o próprio convite usando email do JWT
create policy "family_members: accept invite"
  on public.family_members for update
  using ((auth.jwt() ->> 'email') = invited_email);

-- ── USER DATA ─────────────────────────────────────────────────────
alter table public.user_data enable row level security;

-- Owner: acesso total ao próprio blob
create policy "user_data: owner all"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Membro aceito pode ler dados do owner da família
-- (queries family_members diretamente, sem passar por policies de family_members)
create policy "user_data: member read"
  on public.user_data for select
  using (
    family_id is not null
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = user_data.family_id
        and fm.user_id = auth.uid()
        and fm.accepted_at is not null
    )
  );
