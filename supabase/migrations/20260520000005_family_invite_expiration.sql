-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 005 — Expiração e reenvio de convites familiares
-- Adiciona campos para rastrear expiração e reenvio de convites.
-- Email matching continua sendo o método de aceite (em acceptPendingInvite),
-- mas agora com validação de validade temporal.
-- ═══════════════════════════════════════════════════════════════════

-- expires_at: default = created_at + 7 dias (igual à validade documentada na spec)
alter table public.family_members
  add column if not exists expires_at      timestamptz,
  add column if not exists last_resent_at  timestamptz;

-- Backfill: convites existentes sem expires_at recebem created_at + 7 dias
update public.family_members
   set expires_at = created_at + interval '7 days'
 where expires_at is null
   and accepted_at is null;

-- Default para novos registros via trigger (não use generated — quebra com update)
create or replace function public.family_members_set_expiration()
returns trigger language plpgsql as $$
begin
  if NEW.expires_at is null and NEW.accepted_at is null then
    NEW.expires_at := coalesce(NEW.created_at, now()) + interval '7 days';
  end if;
  return NEW;
end;
$$;

drop trigger if exists set_family_invite_expiration on public.family_members;
create trigger set_family_invite_expiration
  before insert on public.family_members
  for each row execute procedure public.family_members_set_expiration();

-- Índice pra consulta de pendentes/expirados
create index if not exists family_members_expires_at_idx
  on public.family_members (expires_at)
  where accepted_at is null;

-- Comentários
comment on column public.family_members.expires_at     is 'Quando o convite pendente expira (padrão: created_at + 7 dias)';
comment on column public.family_members.last_resent_at is 'Último reenvio do e-mail de convite. Toda vez que admin reenvia, atualiza este campo + estende expires_at';
