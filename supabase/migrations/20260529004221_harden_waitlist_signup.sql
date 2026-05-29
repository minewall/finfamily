-- Hardening da waitlist: tira o INSERT público direto (WITH CHECK true) e
-- passa a aceitar cadastros só via edge function `waitlist-signup` (service
-- role), que valida e aplica rate-limit por IP.

-- Coluna pra rate-limit por IP. Guardamos só o HMAC do IP (pseudônimo),
-- nunca o IP cru — privacidade/LGPD.
alter table public.waitlist
  add column if not exists ip_hash text;

-- Índice pra consulta de rate-limit (mesmo ip_hash na última hora)
create index if not exists waitlist_ip_hash_recent_idx
  on public.waitlist (ip_hash, created_at desc);

-- Remove o INSERT público irrestrito (lint rls_policy_always_true 0024).
-- A edge function insere via service role, que bypassa RLS — anon não
-- insere mais direto. A tabela fica sem policy (deny-by-default p/ anon
-- e authenticated), o que é intencional.
drop policy if exists "waitlist: public insert" on public.waitlist;
