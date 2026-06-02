-- ═══════════════════════════════════════════════════════════════════
-- Billing: payment_events (idempotência webhook) + invoices (snapshot
-- de cobranças) + extensões em subscriptions para integração Asaas.
-- ═══════════════════════════════════════════════════════════════════

-- ── payment_events: append-only, idempotente via asaas_event_id ──
create table if not exists public.payment_events (
  id                     uuid        primary key default gen_random_uuid(),
  asaas_event_id         text        unique,
  event                  text        not null,
  user_id                uuid        references auth.users(id) on delete set null,
  asaas_payment_id       text,
  asaas_subscription_id  text,
  payload                jsonb       not null,
  processed_at           timestamptz,
  process_error          text,
  created_at             timestamptz not null default now()
);

create index if not exists payment_events_user_idx     on public.payment_events (user_id);
create index if not exists payment_events_payment_idx  on public.payment_events (asaas_payment_id);
create index if not exists payment_events_event_idx    on public.payment_events (event, created_at desc);

-- ── invoices: 1 row por cobrança Asaas (asaas_payment_id) ──
create table if not exists public.invoices (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references auth.users(id) on delete cascade,
  subscription_id        uuid        references public.subscriptions(id) on delete set null,
  asaas_payment_id       text        unique not null,
  asaas_subscription_id  text,
  amount_cents           integer     not null,
  net_amount_cents       integer,
  status                 text        not null,
  billing_type           text,
  due_date               date,
  paid_at                timestamptz,
  invoice_url            text,
  bank_slip_url          text,
  pix_qr_code            text,
  pix_payload            text,
  description            text,
  metadata               jsonb       not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint invoices_status_chk check (status in ('pending','paid','overdue','refunded','canceled','failed'))
);

create index if not exists invoices_user_idx          on public.invoices (user_id, created_at desc);
create index if not exists invoices_subscription_idx on public.invoices (subscription_id);

drop trigger if exists invoices_touch_updated_at on public.invoices;
create trigger invoices_touch_updated_at before update on public.invoices
  for each row execute function public.touch_updated_at();

-- ── subscriptions: campos novos para integração Asaas ──
alter table public.subscriptions
  add column if not exists asaas_customer_id text,
  add column if not exists billing_cycle     text,
  add column if not exists next_due_date     date,
  add column if not exists cancel_reason     text;

-- ── RLS ──
alter table public.payment_events enable row level security;
alter table public.invoices       enable row level security;

-- invoices: owner read; writes só service role (webhook).
drop policy if exists "invoices: owner read" on public.invoices;
create policy "invoices: owner read" on public.invoices
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- payment_events: SEM policy de read pública. Service role faz tudo
-- (writes do webhook + leituras de admin). Append-only operacional.

comment on table public.payment_events is 'Webhook events do Asaas, append-only, idempotente via asaas_event_id.';
comment on table public.invoices       is 'Snapshot histórico de cobranças (origem: payments do Asaas).';
comment on column public.subscriptions.asaas_customer_id is 'ID do customer no Asaas (1 por user; resolvido na 1a checkout).';
comment on column public.subscriptions.billing_cycle     is 'Ciclo da assinatura ativa: monthly | annual.';
comment on column public.subscriptions.next_due_date     is 'Próximo vencimento informado pelo Asaas (sincronizado via webhook).';
