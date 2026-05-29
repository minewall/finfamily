-- Bucket `avatars` é público — URLs diretas seguem funcionando sem checar storage.objects.
-- A policy SELECT only permitia LIST via API, vazando estrutura. Removida.
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
