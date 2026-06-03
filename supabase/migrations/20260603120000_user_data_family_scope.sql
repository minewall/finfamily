-- Family-scoping no user_data: membros aceitos podem ler/escrever no blob do head.
-- Antes desta migration: SELECT já cobria membros (via family_id + is_family_member),
-- mas INSERT/UPDATE eram restritos ao owner do row. Sem isso, membros não conseguiam
-- de fato compartilhar finanças — leitura sem escrita.
--
-- A composição da família é resolvida via family_members.user_id + family_groups.owner_id
-- e validada pela função SECURITY DEFINER is_family_member(family_id) já existente.

-- Helper local: o user logado é membro aceito da família cujo head é dado user_id?
create or replace function public.is_family_member_of_head(head_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    join public.family_groups fg on fg.id = fm.family_id
    where fg.owner_id = head_user_id
      and fm.user_id = (select auth.uid())
      and fm.accepted_at is not null
  );
$$;

revoke execute on function public.is_family_member_of_head(uuid) from public, anon;
grant  execute on function public.is_family_member_of_head(uuid) to authenticated;

-- ── policies user_data ────────────────────────────────────────────────
-- Dropamos as 3 policies de escrita anteriores e recriamos cobrindo membros.
drop policy if exists "user_data: owner insert" on public.user_data;
drop policy if exists "user_data: owner update" on public.user_data;
drop policy if exists "user_data: owner delete" on public.user_data;

-- INSERT: dono OU membro aceito do head (cobre 1ª escrita pelo membro)
create policy "user_data: insert own or family"
  on public.user_data
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    or public.is_family_member_of_head(user_id)
  );

-- UPDATE: dono OU membro aceito do head
create policy "user_data: update own or family"
  on public.user_data
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_family_member_of_head(user_id)
  )
  with check (
    (select auth.uid()) = user_id
    or public.is_family_member_of_head(user_id)
  );

-- DELETE: apenas o dono (membros não apagam o blob da família)
create policy "user_data: delete own"
  on public.user_data
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on function public.is_family_member_of_head(uuid) is
  'Retorna true se o auth.uid() atual é membro aceito da família cujo head é head_user_id. Usado pelas RLS policies de user_data pra permitir que membros leiam/escrevam no blob do head.';
