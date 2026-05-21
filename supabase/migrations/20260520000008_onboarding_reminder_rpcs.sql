-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 008 — RPCs do lembrete de onboarding
-- Suporte para a Edge Function `onboarding-reminder`:
--   1. list_onboarding_reminders — busca candidatos elegíveis
--   2. mark_onboarding_reminder_sent — marca lastReminderAt no jsonb
--
-- Ambas SECURITY DEFINER e restritas ao service role
-- (apenas a Edge Function as chama, nunca o cliente).
-- ═══════════════════════════════════════════════════════════════════

-- ── Candidatos a receber lembrete ─────────────────────────────────
-- Critérios:
--   - onboarding.completed != true
--   - onboarding.startedAt < now() - paused_hours horas
--   - lastReminderAt IS NULL OR < now() - cooldown_days dias
-- Retorna campos mínimos para o Resend não precisar de joins extras.
create or replace function public.list_onboarding_reminders(
  paused_hours  int default 24,
  cooldown_days int default 7,
  max_rows      int default 200
)
returns table (
  user_id        uuid,
  email          text,
  name           text,
  paused_at_step int,
  started_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ud.user_id,
    u.email::text,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email::text, '@', 1)
    ) as name,
    coalesce((ud.data->'onboarding'->>'pausedAtStep')::int, 0) as paused_at_step,
    (ud.data->'onboarding'->>'startedAt')::timestamptz as started_at
  from public.user_data ud
  join auth.users u on u.id = ud.user_id
  where
    -- Não completou onboarding
    (ud.data->'onboarding'->>'completed') is distinct from 'true'
    -- Iniciou (caso contrário não tem o que lembrar)
    and (ud.data->'onboarding'->>'startedAt') is not null
    and (ud.data->'onboarding'->>'startedAt')::timestamptz < now() - make_interval(hours => paused_hours)
    -- Cooldown
    and (
      (ud.data->'onboarding'->>'lastReminderAt') is null
      or (ud.data->'onboarding'->>'lastReminderAt')::timestamptz < now() - make_interval(days => cooldown_days)
    )
    -- Tem e-mail (deveria sempre ter, mas defesa)
    and u.email is not null
    and u.email <> ''
  order by (ud.data->'onboarding'->>'startedAt')::timestamptz asc
  limit max_rows;
$$;

revoke all on function public.list_onboarding_reminders(int, int, int) from public;
-- Apenas service role chama (a função é SECURITY DEFINER e a Edge Function
-- valida o bearer antes de chamar). Não conceder a anon nem authenticated.

comment on function public.list_onboarding_reminders is
  'Lista usuários com onboarding pausado há ≥ paused_hours e sem reminder recente. Chamado apenas pela Edge Function onboarding-reminder via service role.';


-- ── Atualizar lastReminderAt no jsonb ─────────────────────────────
create or replace function public.mark_onboarding_reminder_sent(
  target_user_id uuid,
  reminded_at    timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_affected int;
begin
  update public.user_data
     set data = jsonb_set(
       coalesce(data, '{}'::jsonb),
       '{onboarding,lastReminderAt}',
       to_jsonb(reminded_at::text),
       true
     )
   where user_id = target_user_id;

  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$;

revoke all on function public.mark_onboarding_reminder_sent(uuid, timestamptz) from public;

comment on function public.mark_onboarding_reminder_sent is
  'Marca onboarding.lastReminderAt em user_data.data. Chamado pela Edge Function onboarding-reminder.';


-- ═══════════════════════════════════════════════════════════════════
-- CRON JOB — instruções (executar manualmente após habilitar pg_cron)
-- ═══════════════════════════════════════════════════════════════════
-- O bloco abaixo NÃO é executado automaticamente. Para ativar o cron:
--
-- 1. Habilite as extensões no Supabase Dashboard:
--    Database → Extensions → ativar `pg_cron` e `pg_net`
--
-- 2. No SQL Editor, salve o SERVICE_ROLE_KEY no Vault uma única vez:
--    select vault.create_secret('SEU_SERVICE_ROLE_KEY_AQUI', 'service_role_key');
--
-- 3. Crie o cron job (roda diariamente às 14h UTC = 11h BRT):
--
--    select cron.schedule(
--      'onboarding-reminder-daily',
--      '0 14 * * *',
--      $cron$
--      select net.http_post(
--        url     := 'https://lpudgulhnfuwdttetwdn.supabase.co/functions/v1/onboarding-reminder',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer ' || (
--            select decrypted_secret
--              from vault.decrypted_secrets
--             where name = 'service_role_key'
--          )
--        ),
--        body := jsonb_build_object('batchSize', 200)
--      );
--      $cron$
--    );
--
-- 4. Para verificar:  select * from cron.job where jobname = 'onboarding-reminder-daily';
-- 5. Para desativar:  select cron.unschedule('onboarding-reminder-daily');
-- ═══════════════════════════════════════════════════════════════════
