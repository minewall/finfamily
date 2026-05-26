-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 014 — Configurações globais + tier "always_free" + suspensão
--
-- 1. app_settings — chave/valor global pra admin override (modelo default,
--    feature flags, etc.)
-- 2. ai_usage_caps — adiciona tier 'always_free' (cap igual ou maior que free)
-- 3. profiles — coluna previous_tier pra restaurar tier ao reativar
-- ═══════════════════════════════════════════════════════════════════

-- ── app_settings ─────────────────────────────────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

-- RLS: leitura autenticada (claude-proxy lê via service role anyway, mas
-- futuro: cliente pode querer mostrar "Coach está usando Sonnet hoje" etc.)
alter table public.app_settings enable row level security;
drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (true);
-- Sem INSERT/UPDATE/DELETE — só service_role escreve (via edge function admin).

-- Seeds com valores default
insert into public.app_settings (key, value, description) values
  ('default_model', '"claude-haiku-4-5-20251001"'::jsonb, 'Modelo Claude default quando user não escolheu nenhum'),
  ('force_global_model', 'false'::jsonb, 'Se true, força o default_model em todas as chamadas (ignora escolha do user)')
on conflict (key) do nothing;

comment on table public.app_settings is
  'Configurações globais do app, chave/valor. Editáveis pelo admin via edge function admin (actions getGlobalSettings/setGlobalSetting).';

-- ── Tier "always_free" ──────────────────────────────────────────
-- Cap igual ao premium por default (alguém promovido pra always_free é
-- normalmente um VIP / parceiro / founder). Admin pode reduzir via SQL.
insert into public.ai_usage_caps (tier, cap_tokens_month) values
  ('always_free', 2000000)
on conflict (tier) do nothing;

-- ── Coluna previous_tier ─────────────────────────────────────────
-- Guarda o tier anterior à suspensão, pra restaurar quando reativar
-- (em vez de sempre voltar pra 'free').
alter table public.profiles
  add column if not exists previous_tier text;

comment on column public.profiles.previous_tier is
  'Tier anterior à suspensão. Quando admin suspende user, copia o tier atual aqui antes de setar tier=suspended. Reativação restaura.';
