-- ═══════════════════════════════════════════════════════════════════
-- Billing lifecycle cron: avança state machine de assinaturas
-- diariamente (14:00 UTC ≈ 11:00 BRT, alinhado ao onboarding-reminder).
--
-- Casos tratados:
--   1) trial vencido sem invoice paga      → expired
--   2) active + cancel_at_period_end + período passado → cancelled
--
-- Casos NÃO tratados aqui:
--   - past_due (gerenciado pelo webhook PAYMENT_OVERDUE).
--   - renovação ativa (gerenciada pelo webhook PAYMENT_CONFIRMED).
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.advance_subscription_lifecycle()
returns table(user_id uuid, action text, status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1) trial vencido sem pagamento real → expired
  update public.subscriptions s
     set status = 'expired',
         updated_at = now()
   where s.status = 'trial'
     and s.trial_end_at is not null
     and s.trial_end_at < now()
     and not exists (
       select 1 from public.invoices i
        where i.subscription_id = s.id
          and i.status = 'paid'
     );

  -- 2) cancel_at_period_end com período passado → cancelled
  update public.subscriptions s
     set status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   where s.status = 'active'
     and s.cancel_at_period_end = true
     and s.current_period_end is not null
     and s.current_period_end < now();

  -- Retorna o que mudou no último minuto (observabilidade pro caller/cron).
  return query
    select s.user_id,
           case when s.status = 'expired' then 'trial_expired'
                when s.status = 'cancelled' then 'period_end_cancel'
                else 'unknown'
           end as action,
           s.status
      from public.subscriptions s
     where s.updated_at > now() - interval '1 minute'
       and s.status in ('expired','cancelled');
end;
$$;

-- Lockdown: só service_role/cron executa. UI nunca chama isso direto.
revoke execute on function public.advance_subscription_lifecycle() from public, anon, authenticated;

comment on function public.advance_subscription_lifecycle() is
  'Cron diário: trial→expired (sem pagamento) + cancel_at_period_end→cancelled. Service role/pg_cron only.';

-- ── pg_cron job (idempotente: desagenda existente antes de re-agendar) ──
do $$
declare
  v_jobid int;
begin
  select jobid into v_jobid from cron.job where jobname = 'subscription-lifecycle-daily';
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'subscription-lifecycle-daily',
    '0 14 * * *',
    $cmd$ select public.advance_subscription_lifecycle(); $cmd$
  );
end $$;
