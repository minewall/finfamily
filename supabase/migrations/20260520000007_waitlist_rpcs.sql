-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 007 — RPCs públicas para validação e conversão de waitlist
-- Permite que o login.html (anon key) valide um invite_token e marque
-- signup_at sem expor a tabela waitlist via SELECT direto.
--
-- Segurança:
-- - Funções SECURITY DEFINER (rodam como dono, bypassando RLS)
-- - Aceitam apenas um token UUID — sem conhecimento do token, não retorna nada
-- - Retornam só campos necessários (nome, email, expirado)
-- - Não há enumeração possível porque UUID v4 é praticamente impossível de adivinhar
-- ═══════════════════════════════════════════════════════════════════

-- ── Validar invite_token e devolver nome/email ───────────────────
create or replace function public.get_waitlist_invite(token uuid)
returns table (
  name    text,
  email   text,
  expired boolean
)
language sql
security definer
set search_path = public
as $$
  select
    w.name,
    w.email,
    (w.invite_expires_at is not null and w.invite_expires_at < now()) as expired
  from public.waitlist w
  where w.invite_token = token
    and w.invite_token is not null;
$$;

grant execute on function public.get_waitlist_invite(uuid) to anon, authenticated;

comment on function public.get_waitlist_invite is
  'Retorna nome/email/expirado dado um invite_token válido. Não revela existência de outros tokens.';

-- ── Marcar signup_at após cadastro ────────────────────────────────
create or replace function public.mark_waitlist_signup(token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_affected int;
begin
  update public.waitlist
     set signup_at = now()
   where invite_token = token
     and signup_at is null
     and invite_token is not null;

  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$;

grant execute on function public.mark_waitlist_signup(uuid) to anon, authenticated;

comment on function public.mark_waitlist_signup is
  'Marca signup_at na waitlist quando usuário conclui cadastro via invite_token. Idempotente.';
