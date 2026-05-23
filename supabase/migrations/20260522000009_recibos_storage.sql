-- Storage bucket para recibos/anexos de despesas
-- Estrutura de paths: {user_id}/{despesa_id}/{filename}
-- - user_id no primeiro segmento garante isolamento via RLS
-- - despesa_id permite múltiplos anexos por despesa (futuro)
-- - filename mantém nome original para download amigável

-- ─── Bucket ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recibos',
  'recibos',
  false, -- private: acesso apenas via signed URL
  5 * 1024 * 1024, -- 5MB por arquivo
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── RLS policies ───────────────────────────────────────────────────
-- O usuário só lê/escreve/deleta arquivos cujo primeiro segmento do path
-- é o próprio user_id (auth.uid()::text).

drop policy if exists "recibos_select_own" on storage.objects;
drop policy if exists "recibos_insert_own" on storage.objects;
drop policy if exists "recibos_update_own" on storage.objects;
drop policy if exists "recibos_delete_own" on storage.objects;

create policy "recibos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'recibos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "recibos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'recibos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "recibos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'recibos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "recibos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'recibos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Família: membros do mesmo group_id podem ler anexos um do outro
-- (futuro — por ora segurança simples per-user).
