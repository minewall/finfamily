-- Estes 3 SECURITY DEFINER funcs são chamados APENAS server-side via service
-- role (claude-proxy e onboarding-reminder edge functions). Não há caller no
-- frontend. Estavam expostos a anon/authenticated via /rest/v1/rpc/*, o que
-- permitia, p.ex., qualquer usuário logado consultar o uso de IA de QUALQUER
-- user_id (ai_usage_current_month). REVOKE de anon/authenticated/public fecha
-- a exposição; service_role continua executando (não é afetado por estes grants).

REVOKE EXECUTE ON FUNCTION public.ai_usage_current_month(uuid)
  FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.list_onboarding_reminders(integer, integer, integer)
  FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.mark_onboarding_reminder_sent(uuid, timestamptz)
  FROM anon, authenticated, public;
