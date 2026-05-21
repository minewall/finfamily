-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 004 — Fix: waitlist_stats deve usar SECURITY INVOKER
-- O linter do Supabase aponta que views SECURITY DEFINER ignoram RLS
-- do usuário que consulta. Como esta view só deve ser acessível ao
-- service role (anon/authenticated não têm policy de select em
-- waitlist), trocar para security_invoker é seguro e remove o warning.
-- ═══════════════════════════════════════════════════════════════════

drop view if exists public.waitlist_stats;

create view public.waitlist_stats
  with (security_invoker = true)
as
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

comment on view public.waitlist_stats is
  'Métricas de conversão da waitlist. SECURITY INVOKER: respeita RLS do caller (só service role consegue ler).';
