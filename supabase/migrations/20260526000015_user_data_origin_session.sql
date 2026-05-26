-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 015 — origin_session_id em user_data (anti-echo do Realtime)
--
-- Quando o app de Mari faz push na nuvem, a own subscription Realtime
-- recebe um UPDATE — sem origin tracking, ela acharia que outro device
-- editou e dispararia pull + replace local, gerando flicker.
--
-- Solução: cada sessão (aba/device) gera um UUID em sessionStorage e
-- inclui em todo push. Realtime callback compara: se origin == minha
-- sessão, ignora.
-- ═══════════════════════════════════════════════════════════════════

alter table public.user_data
  add column if not exists origin_session_id text;

comment on column public.user_data.origin_session_id is
  'UUID gerado pela sessão do client (por-tab). Permite filtrar eco no Realtime — pull só dispara quando origin != minha sessão.';
