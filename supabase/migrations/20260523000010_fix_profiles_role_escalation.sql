-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 010 — Fix [U1/C4] privilege escalation via REST PATCH
--
-- Antes:
--   create policy "profiles: owner update" on profiles for update
--     using (auth.uid() = id);  -- ← sem WITH CHECK, sem restrição de coluna
--
-- Vulnerabilidade:
--   RLS no Postgres só restringe LINHAS, não COLUNAS. Qualquer user
--   autenticado podia PATCH /rest/v1/profiles com {"role":"admin"} ou
--   {"tier":"premium"} e ganhar acesso total ao painel admin / burlar
--   paywall. role/tier devem ser mutados APENAS via service_role
--   (Edge admin) ou trigger BEFORE UPDATE.
--
-- Fix (column-level GRANT):
--   - REVOKE UPDATE total em profiles para authenticated
--   - GRANT UPDATE apenas em (email, full_name) — colunas seguras
--   - Re-criar policy com WITH CHECK (defense-in-depth contra UPDATE
--     que tente mudar o próprio id).
--
-- Notas:
--   - App cliente apenas SELECT em profiles (supabase-client.js:445).
--     Nenhuma operação de UPDATE em profiles existe no client hoje.
--   - admin Edge Function usa service_role → ignora GRANT/RLS, OK.
--   - handle_new_user() trigger usa SECURITY DEFINER → OK.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Re-criar policy com WITH CHECK
drop policy if exists "profiles: owner update" on public.profiles;
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Column-level GRANTs: bloquear UPDATE em role/tier/created_at/updated_at
revoke update on public.profiles from authenticated;
grant update (email, full_name) on public.profiles to authenticated;

-- 3. Verificação: o anon role NÃO deve ter UPDATE algum (nem mesmo seguro)
revoke update on public.profiles from anon;
