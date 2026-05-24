-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 011 — Fix [M2] privilege escalation em family_members
--
-- Antes:
--   create policy "family_members: accept invite" on family_members for update
--     using ((auth.jwt() ->> 'email') = invited_email);  -- sem WITH CHECK, sem coluna
--
-- Vulnerabilidade:
--   Convidado, ao "aceitar" o convite (UPDATE na própria linha onde
--   invited_email = JWT.email), podia incluir { "role": "admin" } no
--   PATCH e virar admin da família, ganhando permissões para alterar
--   outros membros, settings da família, ver dados privados do owner, etc.
--
-- Fix:
--   - REVOKE UPDATE total em family_members
--   - GRANT UPDATE só nas colunas funcionalmente necessárias:
--       * user_id, accepted_at  → convidado aceitar próprio convite
--       * expires_at, last_resent_at → owner reenviar convite
--   - Adiciona WITH CHECK na policy "accept invite" (defense-in-depth)
--
-- Impacto funcional:
--   ✓ Convidado aceita convite (supabase-client.js:342 — accepted_at + user_id)
--   ✓ Owner reenvia convite (supabase-client.js:305 — expires_at + last_resent_at)
--   ✓ Owner remove membro (DELETE, não afetado por GRANT UPDATE)
--   ✗ Nenhuma UI hoje altera role; quando precisar, criar RPC SECURITY DEFINER
--
-- Limitação aceita:
--   Convidado também pode UPDATE expires_at/last_resent_at na própria linha
--   (não é vetor de escalation — só estende a janela do próprio convite).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Re-criar policy com WITH CHECK
drop policy if exists "family_members: accept invite" on public.family_members;
create policy "family_members: accept invite"
  on public.family_members for update
  using ((auth.jwt() ->> 'email') = invited_email)
  with check ((auth.jwt() ->> 'email') = invited_email);

-- 2. Column-level GRANTs: bloquear UPDATE em role, family_id, invited_email,
--    pessoa_name, created_at, invited_at (qualquer coluna sensível).
revoke update on public.family_members from authenticated;
grant update (user_id, accepted_at, expires_at, last_resent_at)
  on public.family_members to authenticated;

-- 3. Garantir que anon não tem UPDATE.
revoke update on public.family_members from anon;
