-- Índices em FKs sem cobertura (lint 0001)
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_by
  ON public.app_settings(updated_by);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id
  ON public.family_members(user_id);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_completed_by
  ON public.lgpd_requests(completed_by);

CREATE INDEX IF NOT EXISTS idx_user_data_family_id
  ON public.user_data(family_id);

-- Drop do índice duplicado (lint 0009): family_groups_owner_id_key (UNIQUE) cobre owner_id
DROP INDEX IF EXISTS public.family_groups_owner_idx;
