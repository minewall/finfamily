-- Fix search_path mutável nas 3 funcs flagadas pelo linter (0011).
-- is_family_member é SECURITY DEFINER (crítico). As outras 2 são triggers (defesa em profundidade).

ALTER FUNCTION public.is_family_member(uuid) SET search_path = 'public';
ALTER FUNCTION public.family_members_set_expiration() SET search_path = 'public';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'public';
