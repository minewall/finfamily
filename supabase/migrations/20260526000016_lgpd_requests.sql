-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 016 — LGPD Requests (audit trail de DSARs)
--
-- Lei Geral de Proteção de Dados (Brasil) garante 4 direitos:
-- - Acesso/portabilidade (exportar dados) → tipo 'export'
-- - Retificação                          → tipo 'rectify' (informativo)
-- - Exclusão (right to be forgotten)     → tipo 'delete'
-- - Oposição ao tratamento               → tipo 'object'
--
-- Esta tabela mantém o histórico de solicitações pra auditoria. As ações
-- (export, delete) usam as edge functions admin.exportUser / deleteUser
-- já existentes.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.lgpd_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  user_email    text, -- snapshot do email no momento do pedido (útil mesmo após delete)
  request_type  text not null check (request_type in ('export', 'delete', 'rectify', 'object')),
  status        text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  notes         text,
  requested_at  timestamptz not null default now(),
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_lgpd_status   on public.lgpd_requests (status, requested_at desc);
create index if not exists idx_lgpd_user     on public.lgpd_requests (user_id, requested_at desc);

alter table public.lgpd_requests enable row level security;

-- User vê suas próprias solicitações
drop policy if exists "lgpd_select_own" on public.lgpd_requests;
create policy "lgpd_select_own" on public.lgpd_requests for select
  using (auth.uid() = user_id);

-- User pode criar pedidos pra si mesmo
drop policy if exists "lgpd_insert_own" on public.lgpd_requests;
create policy "lgpd_insert_own" on public.lgpd_requests for insert
  with check (auth.uid() = user_id);

-- Sem UPDATE/DELETE policies — só service_role (via edge function admin)
-- pode completar/rejeitar pedidos.

comment on table public.lgpd_requests is
  'Audit trail de DSARs (Data Subject Access Requests) conforme LGPD. User cria, admin processa.';
