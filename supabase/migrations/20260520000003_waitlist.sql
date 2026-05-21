-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 003 — Waitlist (pré-lançamento)
-- Armazena leads coletados no formulário de lista de espera.
-- Acesso via anon key (insert público) + service role (leitura admin).
-- ═══════════════════════════════════════════════════════════════════

-- ── TABELA ───────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null,
  profile      text        check (profile in ('individual', 'casal', 'familia', 'outro')),
  source       text        default 'home',   -- 'home' | 'precos' | 'contato' | 'indicacao' | ...
  invited_at   timestamptz,                  -- quando o convite de lançamento foi enviado
  signup_at    timestamptz,                  -- quando o usuário criou a conta de fato
  created_at   timestamptz not null default now()
);

-- e-mail único: impede duplicatas e permite upsert por email no futuro
create unique index if not exists waitlist_email_idx on public.waitlist (lower(email));

-- índices de consulta frequente
create index if not exists waitlist_invited_at_idx  on public.waitlist (invited_at);
create index if not exists waitlist_source_idx      on public.waitlist (source);
create index if not exists waitlist_created_at_idx  on public.waitlist (created_at desc);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
alter table public.waitlist enable row level security;

-- Qualquer visitante (anon) pode inserir — necessário para o form público
create policy "waitlist: public insert"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Leitura e atualização apenas via service role (admin / Edge Functions)
-- Nenhuma policy de select/update para anon ou authenticated:
-- o anon key não consegue ler ou alterar registros existentes.

-- ── VIEWS ÚTEIS (métricas) ───────────────────────────────────────
-- Vista de conversão — disponível apenas para service role
create or replace view public.waitlist_stats as
select
  count(*)                                              as total,
  count(*) filter (where invited_at is not null)        as total_invited,
  count(*) filter (where signup_at  is not null)        as total_converted,
  round(
    100.0 * count(*) filter (where signup_at is not null)
    / nullif(count(*) filter (where invited_at is not null), 0),
    1
  )                                                     as conversion_pct,
  round(
    extract(epoch from avg(signup_at - invited_at)) / 3600,
    1
  )                                                     as avg_hours_to_signup,
  source,
  date_trunc('day', created_at)                         as day
from public.waitlist
group by source, date_trunc('day', created_at)
order by day desc, total desc;

-- ── COMENTÁRIOS ──────────────────────────────────────────────────
comment on table  public.waitlist              is 'Leads de lista de espera pré-lançamento do Haile';
comment on column public.waitlist.profile      is 'Perfil declarado: individual | casal | familia | outro';
comment on column public.waitlist.source       is 'Origem do cadastro (página ou campanha)';
comment on column public.waitlist.invited_at   is 'Timestamp do disparo do convite de lançamento';
comment on column public.waitlist.signup_at    is 'Timestamp da criação de conta — preenchido via trigger ou Edge Function';
