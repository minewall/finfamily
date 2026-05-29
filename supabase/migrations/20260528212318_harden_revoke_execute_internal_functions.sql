-- Trigger-only functions: PostgreSQL não exige EXECUTE para que a trigger dispare.
-- Revogando EXECUTE retira essas funcs do REST API e evita fingerprinting.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.family_members_set_expiration() FROM PUBLIC, anon, authenticated;

-- is_family_member e is_family_owner são chamadas DENTRO de RLS policies pelo role authenticated;
-- precisamos manter EXECUTE pra authenticated. Revogamos apenas de anon (não há policy anon que as use).
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_family_owner(uuid)  FROM PUBLIC, anon;
