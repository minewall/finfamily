-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 006 — Waitlist invite tokens
-- Adiciona colunas de token + expiração para a campanha de lançamento.
-- Disparada pela Edge Function `waitlist-launch`.
-- ═══════════════════════════════════════════════════════════════════

alter table public.waitlist
  add column if not exists invite_token       uuid,
  add column if not exists invite_expires_at  timestamptz;

-- Token deve ser único quando preenchido (permite reset/regeneração via UPDATE)
create unique index if not exists waitlist_invite_token_idx
  on public.waitlist (invite_token)
  where invite_token is not null;

-- Consulta frequente: validar token + checar expiração no fluxo de signup
create index if not exists waitlist_invite_expires_at_idx
  on public.waitlist (invite_expires_at)
  where invite_token is not null;

comment on column public.waitlist.invite_token      is 'Token único do convite de lançamento (UUID). Usado no link enviado por e-mail.';
comment on column public.waitlist.invite_expires_at is 'Expiração do invite_token. Default: invited_at + 30 dias.';