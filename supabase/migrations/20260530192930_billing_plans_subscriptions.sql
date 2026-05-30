-- ═══════════════════════════════════════════════════════════════════
-- Billing: plans + subscriptions (estrutura base — SEM checkout ainda)
-- Modelo: 2 tiers (base / premium) × 2 ciclos (monthly / annual).
-- Trial 21d com acesso premium. Preços PROVISÓRIOS (editáveis no admin /
-- pendentes da cotação de Open Finance). Reconciliação com profiles.tier +
-- ai_usage_caps será feita num passo separado (toca o sistema de IA vivo).
-- ═══════════════════════════════════════════════════════════════════

-- ── PLANS: fonte de verdade dos preços (admin-editável, sem deploy) ──
create table if not exists public.plans (
  id               text        primary key,            -- ex: 'base_monthly'
  tier             text        not null,               -- 'base' | 'premium'
  billing_interval text        not null,               -- 'monthly' | 'annual'
  name             text        not null,               -- nome de exibição (provisório)
  amount_cents     integer     not null default 0,     -- preço em centavos (provisório)
  currency         text        not null default 'BRL',
  is_active        boolean     not null default true,
  features         jsonb       not null default '{}'::jsonb,
  sort_order       integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint plans_tier_chk     check (tier in ('base','premium')),
  constraint plans_interval_chk check (billing_interval in ('monthly','annual'))
);

-- ── SUBSCRIPTIONS: 1 por "family head" (quem assina) ─────────────────
create table if not exists public.subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  family_id            uuid        references public.family_groups(id) on delete set null,
  plan_id              text        references public.plans(id),
  tier                 text        not null default 'premium',  -- tier efetivo (trial = acesso premium)
  status               text        not null default 'trial',    -- trial|active|past_due|cancelled|expired
  trial_start_at       timestamptz default now(),
  trial_end_at         timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean     not null default false,
  cancelled_at         timestamptz,
  founder_price_locked boolean     not null default false,       -- founder price time-boxed/locked
  asaas_subscription_id text,                                    -- preenchido pelo checkout futuro
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint subscriptions_status_chk check (status in ('trial','active','past_due','cancelled','expired')),
  constraint subscriptions_tier_chk   check (tier in ('base','premium')),
  unique (user_id)
);

create index if not exists subscriptions_user_idx   on public.subscriptions (user_id);
create index if not exists subscriptions_family_idx on public.subscriptions (family_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ── updated_at automático (reusa touch_updated_at já existente) ──────
drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at before update on public.plans
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;

-- plans: leitura pública (página de preços precisa). Escrita só service role.
create policy "plans: public read" on public.plans
  for select to anon, authenticated using (true);

-- subscriptions: o head vê a própria; membro da família vê a do grupo.
-- Escrita só via service role (edge de billing) — sem policy de write.
create policy "subscriptions: owner read" on public.subscriptions
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (family_id is not null and public.is_family_member(family_id))
  );

-- ── SEED: 4 planos (preços PROVISÓRIOS — editar no admin pós-cotação OF) ──
insert into public.plans (id, tier, billing_interval, name, amount_cents, sort_order, features) values
  ('base_monthly',    'base',    'monthly', 'Haile',         4900,  10, '{"open_finance": false, "import_extratos": true,  "limite_interacao_diaria": true}'::jsonb),
  ('base_annual',     'base',    'annual',  'Haile',         49000, 11, '{"open_finance": false, "import_extratos": true,  "limite_interacao_diaria": true}'::jsonb),
  ('premium_monthly', 'premium', 'monthly', 'Haile Premium', 8900,  20, '{"open_finance": true,  "import_extratos": true,  "limite_interacao_diaria": false}'::jsonb),
  ('premium_annual',  'premium', 'annual',  'Haile Premium', 89000, 21, '{"open_finance": true,  "import_extratos": true,  "limite_interacao_diaria": false}'::jsonb)
on conflict (id) do nothing;

comment on table public.plans is 'Planos de assinatura (preços provisórios — editáveis pelo admin, pendentes de cotação Open Finance). 2 tiers (base/premium) × 2 ciclos.';
comment on table public.subscriptions is '1 assinatura por family head. State machine: trial(21d)→active→past_due→cancelled→expired.';

-- Config de trial (não-preço) em app_settings
insert into public.app_settings (key, value, description) values
  ('trial_duration_days', '21'::jsonb, 'Duração do trial em dias'),
  ('trial_reminder_days', '[14,18,20]'::jsonb, 'Dias do trial em que disparar lembrete editorial'),
  ('trial_requires_card', 'false'::jsonb, 'Exigir cartão na entrada do trial'),
  ('pricing_currency', '"BRL"'::jsonb, 'Moeda dos planos'),
  ('founder_pricing_enabled', 'false'::jsonb, 'Ativar preço founder time-boxed (Cenário C)'),
  ('annual_installments', '10'::jsonb, 'Plano anual cobrado em N parcelas mensais (Asaas recorrência)'),
  ('annual_discount_months', '2'::jsonb, 'Desconto do anual expresso em meses grátis (12 pagando 10)')
on conflict (key) do nothing;
