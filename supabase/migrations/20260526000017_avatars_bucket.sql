-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 017 — Bucket de avatares de usuário
--
-- Estrutura de paths: {user_id}/avatar.{ext}
-- RLS:
--   - Qualquer um pode LER (avatar é público — aparece no Painel da Família)
--   - User só pode escrever no PRÓPRIO folder (primeiro segmento do path)
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- ── Policies ─────────────────────────────────────────────────────
-- Leitura pública (avatar é compartilhado entre membros da família)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload: só no próprio folder
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (re-upload do mesmo arquivo)
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete (remover foto)
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on policy "avatars_public_read" on storage.objects is
  'Avatares públicos: qualquer um vê. Útil pra Painel da Família e futuros componentes social.';
