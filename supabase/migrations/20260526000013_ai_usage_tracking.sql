-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 013 — Telemetria de uso de IA + caps por tier
--
-- Objetivo: prevenir sangria de custo do Anthropic API quando o paywall
-- abrir. Cada chamada do claude-proxy passa a logar input_tokens e
-- output_tokens. Antes de chamar, a function consulta o consumo do mês
-- vs cap do tier do user; se acima, retorna 429.
-- ═══════════════════════════════════════════════════════════════════

-- ── Tabela de telemetria ──────────────────────────────────────────
create table if not exists public.ai_usage (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  model         text not null,
  input_tokens  int  not null default 0,
  output_tokens int  not null default 0,
  -- Custo estimado em USD * 1000 (microcents). Calculado no edge function
  -- pra evitar perda de precisão no float. Multiplicar por 0.000001 pra ter $.
  cost_micro_usd bigint not null default 0,
  -- Metadados úteis pra debug e auditoria
  request_id    text,
  notes         text
);

-- Índices: consulta principal é "soma de tokens do user X no mês corrente"
create index if not exists idx_ai_usage_user_month
  on public.ai_usage (user_id, occurred_at desc);
create index if not exists idx_ai_usage_occurred
  on public.ai_usage (occurred_at desc);

-- RLS: o user só vê o próprio consumo. Admin vê tudo (via service_role no edge).
alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- Sem INSERT/UPDATE/DELETE policies — só service_role pode escrever
-- (edge function claude-proxy usa service role pra logar).

-- ── RPC: soma de tokens do mês corrente pro user autenticado ──────
-- Pra ser chamada do edge function (preflight cap check) e do client
-- (mostrar consumo no dashboard pessoal, futuro).
create or replace function public.ai_usage_current_month(target_user_id uuid)
returns table (
  total_input_tokens   bigint,
  total_output_tokens  bigint,
  total_cost_micro_usd bigint,
  request_count        bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(input_tokens), 0)::bigint   as total_input_tokens,
    coalesce(sum(output_tokens), 0)::bigint  as total_output_tokens,
    coalesce(sum(cost_micro_usd), 0)::bigint as total_cost_micro_usd,
    count(*)::bigint                         as request_count
  from public.ai_usage
  where user_id = target_user_id
    and occurred_at >= date_trunc('month', now());
$$;

grant execute on function public.ai_usage_current_month(uuid) to authenticated, service_role;

comment on function public.ai_usage_current_month is
  'Soma o consumo de IA do user no mês corrente. Usado pelo claude-proxy pro preflight cap check e pelo dashboard.';

-- ── Caps por tier (default — admin pode override via env vars) ────
-- Valores conservadores baseados em ~R$ 0.30 / 1k input tokens Sonnet
-- e custo proporcional pra Haiku.
-- free:    50k tokens/mês (~10-15 conversas curtas com Haiku)
-- plus:    500k tokens/mês (~uso diário moderado)
-- premium: 2M tokens/mês (~uso diário intenso)
-- A enforcement vive no edge function — esta tabela é só fonte da verdade.
create table if not exists public.ai_usage_caps (
  tier             text primary key,
  cap_tokens_month bigint not null,
  -- Soft cap (warning): X% antes do limite duro
  soft_cap_pct     int not null default 80,
  updated_at       timestamptz not null default now()
);

-- Seeds
insert into public.ai_usage_caps (tier, cap_tokens_month) values
  ('free',      50000),
  ('plus',     500000),
  ('premium', 2000000),
  ('admin',  10000000)  -- admin praticamente sem limite, pra desenvolvimento
on conflict (tier) do nothing;

-- RLS: leitura pública (cliente precisa saber qual é seu cap)
alter table public.ai_usage_caps enable row level security;
drop policy if exists "ai_usage_caps_read" on public.ai_usage_caps;
create policy "ai_usage_caps_read" on public.ai_usage_caps for select using (true);

comment on table public.ai_usage_caps is
  'Caps mensais de tokens de IA por tier. Atualizável pelo admin diretamente no SQL Editor.';
