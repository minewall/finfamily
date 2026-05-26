-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 012 — Habilitar Realtime na tabela user_data
-- Permite ao frontend escutar mudanças remotas (sync multi-device) via
-- supabase_realtime publication.
--
-- Para o app:
-- - SupabaseSync.subscribeRealtime() listener no canal user_data:user_id=eq.X
-- - Notifica usuário quando outro device atualiza o mesmo usuário
-- - Por ora, callback do client decide se aplica diff ou só avisa
--
-- Segurança: RLS já garante que o canal só envia eventos das próprias linhas.
-- ═══════════════════════════════════════════════════════════════════

-- Adiciona user_data à publication padrão do Supabase Realtime.
-- Idempotente: se já estiver lá, retorna erro mas a migration prossegue
-- via DO block silenciando o erro específico.
do $$
begin
  begin
    alter publication supabase_realtime add table public.user_data;
  exception
    when duplicate_object then
      raise notice 'user_data já estava em supabase_realtime — ok';
  end;
end$$;

-- Garantia: a tabela precisa de REPLICA IDENTITY pra Realtime funcionar
-- direito em UPDATEs (caso contrário, o payload vem com OLD limitado).
alter table public.user_data replica identity full;
