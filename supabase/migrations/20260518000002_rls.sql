-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 002 — Row Level Security
-- ═══════════════════════════════════════════════════════════════════

-- ── PROFILES ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Usuário lê/edita só o próprio perfil
create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- Admin lê todos os perfis (para o Admin Panel)
create policy "profiles: admin read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "profiles: admin update all"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── FAMILY GROUPS ─────────────────────────────────────────────────
alter table public.family_groups enable row level security;

-- Owner cria e lê seu grupo
create policy "family_groups: owner all"
  on public.family_groups for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Membro aceito pode ler o grupo da família
create policy "family_groups: member read"
  on public.family_groups for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = id
        and fm.user_id = auth.uid()
        and fm.accepted_at is not null
    )
  );

-- Admin lê todos
create policy "family_groups: admin read"
  on public.family_groups for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── FAMILY MEMBERS ────────────────────────────────────────────────
alter table public.family_members enable row level security;

-- Owner do grupo gerencia membros
create policy "family_members: owner all"
  on public.family_members for all
  using (
    exists (
      select 1 from public.family_groups fg
      where fg.id = family_id and fg.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_groups fg
      where fg.id = family_id and fg.owner_id = auth.uid()
    )
  );

-- Editor pode ver membros do grupo
create policy "family_members: editor read"
  on public.family_members for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = family_id
        and fm.user_id = auth.uid()
        and fm.role in ('editor', 'admin')
        and fm.accepted_at is not null
    )
  );

-- Membro aceito pode ler os próprios dados (para aceitar convite)
create policy "family_members: self read"
  on public.family_members for select
  using (user_id = auth.uid() or invited_email = (
    select email from auth.users where id = auth.uid()
  ));

-- Membro aceita o próprio convite (update só no próprio registro)
create policy "family_members: accept invite"
  on public.family_members for update
  using (
    invited_email = (select email from auth.users where id = auth.uid())
  );

-- Admin lê tudo
create policy "family_members: admin read"
  on public.family_members for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── USER DATA ─────────────────────────────────────────────────────
alter table public.user_data enable row level security;

-- Owner: acesso total ao próprio blob
create policy "user_data: owner all"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Editor de família pode ler os dados do owner (para visualizar como membro)
create policy "user_data: family editor read"
  on public.user_data for select
  using (
    exists (
      select 1 from public.family_members fm
      join public.family_groups fg on fg.id = fm.family_id
      where fg.owner_id = user_id          -- lendo os dados do owner
        and fm.user_id = auth.uid()        -- eu sou membro
        and fm.role in ('editor', 'member')
        and fm.accepted_at is not null
    )
  );

-- Admin lê tudo
create policy "user_data: admin read"
  on public.user_data for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
