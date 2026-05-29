-- Reescrita das policies pra:
--   (a) wrap em (select auth.*()) — evita re-evaluation por linha (lint 0003)
--   (b) consolidar permissive policies sobrepostas em user_data e family_members (lint 0006)

-- ===== ai_usage =====
DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage;
CREATE POLICY ai_usage_select_own ON public.ai_usage
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- ===== family_groups =====
DROP POLICY IF EXISTS "family_groups: owner all" ON public.family_groups;
CREATE POLICY "family_groups: owner all" ON public.family_groups
  FOR ALL TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- ===== profiles =====
DROP POLICY IF EXISTS "profiles: owner read" ON public.profiles;
CREATE POLICY "profiles: owner read" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ===== lgpd_requests =====
DROP POLICY IF EXISTS lgpd_select_own ON public.lgpd_requests;
CREATE POLICY lgpd_select_own ON public.lgpd_requests
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS lgpd_insert_own ON public.lgpd_requests;
CREATE POLICY lgpd_insert_own ON public.lgpd_requests
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ===== user_data — consolidar SELECT (owner+member) em policy única =====
DROP POLICY IF EXISTS "user_data: owner all"   ON public.user_data;
DROP POLICY IF EXISTS "user_data: member read" ON public.user_data;

-- SELECT: dono OU membro aceito da família
CREATE POLICY "user_data: read" ON public.user_data
  FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR (family_id IS NOT NULL AND public.is_family_member(family_id))
  );

-- INSERT/UPDATE/DELETE: apenas dono
CREATE POLICY "user_data: owner insert" ON public.user_data
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_data: owner update" ON public.user_data
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_data: owner delete" ON public.user_data
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ===== family_members — consolidar e wrap =====
DROP POLICY IF EXISTS "family_members: owner all"      ON public.family_members;
DROP POLICY IF EXISTS "family_members: self read"      ON public.family_members;
DROP POLICY IF EXISTS "family_members: accept invite"  ON public.family_members;

-- SELECT: dono da família OU eu mesmo OU convidado pelo meu email
CREATE POLICY "family_members: read" ON public.family_members
  FOR SELECT TO authenticated
  USING (
    public.is_family_owner(family_id)
    OR user_id = (select auth.uid())
    OR invited_email = ((select auth.jwt()) ->> 'email')
  );

-- INSERT: apenas dono da família
CREATE POLICY "family_members: owner insert" ON public.family_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id));

-- UPDATE: dono da família OU convidado aceitando o convite
CREATE POLICY "family_members: update" ON public.family_members
  FOR UPDATE TO authenticated
  USING (
    public.is_family_owner(family_id)
    OR invited_email = ((select auth.jwt()) ->> 'email')
  )
  WITH CHECK (
    public.is_family_owner(family_id)
    OR invited_email = ((select auth.jwt()) ->> 'email')
  );

-- DELETE: apenas dono da família
CREATE POLICY "family_members: owner delete" ON public.family_members
  FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id));
