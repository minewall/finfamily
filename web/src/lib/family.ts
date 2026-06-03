// ── Família / convites ───────────────────────────────────────────────
// Wrapper pro DUO sobre o backend de família do Dino:
//   - Tabela family_groups (id, name, owner_id)
//   - Tabela family_members (id, family_id, user_id, role, invited_email,
//                             pessoa_name, accepted_at, created_at,
//                             expires_at, last_resent_at)
//   - Edge function family-invite (envia magic link via Resend/Supabase Auth)
//
// O Dino NÃO tem uma edge `accept-invite` separada — o "accept" acontece
// quando o convidado faz login (Supabase Auth via magic link) e
// `acceptPendingInvite()` casa o email do user com a row em family_members,
// preenchendo user_id + accepted_at.
//
// Portamos a mesma semântica aqui. Wrappers expõem uma superfície async
// limpa pra a UI do DUO.

import { supabase } from './supabase'

export type FamilyRole = 'admin' | 'editor' | 'member' | 'viewer'
export type InviteStatus = 'active' | 'pending' | 'expired'

export interface FamilyGroup {
  id: string
  name: string | null
  owner_id: string
}

export interface FamilyMemberRow {
  id: string
  family_id: string
  user_id: string | null
  role: FamilyRole | string
  invited_email: string | null
  pessoa_name: string | null
  accepted_at: string | null
  created_at: string | null
  expires_at: string | null
  last_resent_at: string | null
}

export interface FamilyContext {
  groupId: string
  ownerId: string
  role: 'admin' | FamilyRole | string
  dataOwnerUserId: string
  pessoaName?: string | null
}

export interface InviteEmailResult {
  sent?: boolean
  alreadyExists?: boolean
  error?: string | { message?: string }
  userId?: string | null
}

export interface InviteResult {
  data?: FamilyMemberRow | null
  error?: string | null
  emailResult?: InviteEmailResult
}

// ── helpers internos ──────────────────────────────────────────────────

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

/** Status visual do convite — mesma regra do Dino. */
export function inviteStatus(member: FamilyMemberRow): InviteStatus {
  if (member.accepted_at) return 'active'
  if (member.expires_at && new Date(member.expires_at) < new Date()) return 'expired'
  return 'pending'
}

// ── group CRUD ────────────────────────────────────────────────────────

export async function getFamilyGroup(): Promise<FamilyGroup | null> {
  const user = await currentUser()
  if (!user) return null
  const { data } = await supabase
    .from('family_groups')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
    .maybeSingle()
  return (data as FamilyGroup | null) ?? null
}

export async function createOrGetFamilyGroup(
  name?: string,
): Promise<{ data?: FamilyGroup; error?: string }> {
  const user = await currentUser()
  if (!user) return { error: 'Não conectado' }
  const existing = await getFamilyGroup()
  if (existing) return { data: existing }
  const { data, error } = await supabase
    .from('family_groups')
    .insert({ name: name || 'Minha Família', owner_id: user.id })
    .select()
    .single()
  if (error) return { error: error.message }
  if (data) {
    // Mesmo passo do Dino: amarra user_data do owner ao family_id
    // pra RLS de membros funcionar quando forem ler o blob.
    await supabase.from('user_data').update({ family_id: data.id }).eq('user_id', user.id)
  }
  return { data: data as FamilyGroup }
}

// ── membership ────────────────────────────────────────────────────────

/** Lista TODOS os membros (ativos + pendentes + expirados) da família do user logado. */
export async function listFamilyMembers(): Promise<FamilyMemberRow[]> {
  const group = await getFamilyGroup()
  if (!group) return []
  const { data } = await supabase
    .from('family_members')
    .select(
      'id, family_id, user_id, role, invited_email, pessoa_name, accepted_at, created_at, expires_at, last_resent_at',
    )
    .eq('family_id', group.id)
    .order('created_at')
  return (data as FamilyMemberRow[] | null) ?? []
}

/** Apenas convites pendentes (não aceitos) — útil pra UI separada. */
export async function listPendingInvites(): Promise<FamilyMemberRow[]> {
  const all = await listFamilyMembers()
  return all.filter((m) => !m.accepted_at)
}

/** Convites ENDEREÇADOS ao user logado (entrar em famílias de outras pessoas). */
export async function listMyPendingInvites(): Promise<FamilyMemberRow[]> {
  const user = await currentUser()
  if (!user?.email) return []
  const { data } = await supabase
    .from('family_members')
    .select(
      'id, family_id, user_id, role, invited_email, pessoa_name, accepted_at, created_at, expires_at, last_resent_at',
    )
    .eq('invited_email', user.email)
    .is('accepted_at', null)
  return (data as FamilyMemberRow[] | null) ?? []
}

// ── invite / remove / resend / cancel ────────────────────────────────

export async function inviteMember(
  email: string,
  role: FamilyRole = 'member',
  pessoaName?: string,
  options?: { sendEmail?: boolean },
): Promise<InviteResult> {
  const emailNorm = (email || '').trim().toLowerCase()
  if (!emailNorm) return { error: 'E-mail obrigatório' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return { error: 'E-mail inválido' }

  const { data: group, error: ge } = await createOrGetFamilyGroup()
  if (ge || !group) return { error: ge ?? 'Erro ao criar grupo familiar' }

  // Já convidado?
  const { data: existing } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', group.id)
    .eq('invited_email', emailNorm)
    .maybeSingle()
  if (existing) return { error: 'Este e-mail já foi convidado' }

  const row: Record<string, unknown> = {
    family_id: group.id,
    invited_email: emailNorm,
    role,
    user_id: null,
  }
  if (pessoaName) row.pessoa_name = pessoaName

  const { data, error } = await supabase
    .from('family_members')
    .insert(row)
    .select()
    .single()
  if (error) return { error: error.message }

  const member = data as FamilyMemberRow
  const sendEmail = options?.sendEmail ?? true
  if (!sendEmail) return { data: member, error: null }

  const emailResult = await sendInviteEmail(emailNorm, role, pessoaName, group)
  return { data: member, error: null, emailResult }
}

/** Reenvia convite — estende expires_at +7d e re-dispara e-mail. */
export async function resendInvite(memberId: string): Promise<InviteResult> {
  const user = await currentUser()
  if (!user) return { error: 'Não conectado' }
  const { data: invite, error: ie } = await supabase
    .from('family_members')
    .select(
      'id, family_id, role, invited_email, pessoa_name, accepted_at, family_groups(id, name, owner_id)',
    )
    .eq('id', memberId)
    .maybeSingle()
  if (ie || !invite) return { error: 'Convite não encontrado' }
  const inv = invite as unknown as FamilyMemberRow & {
    family_groups?: { id: string; name: string | null; owner_id: string } | null
  }
  if (inv.accepted_at) return { error: 'Este convite já foi aceito' }
  if (inv.family_groups?.owner_id !== user.id) {
    return { error: 'Apenas o administrador pode reenviar' }
  }
  const now = new Date()
  const newExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const { error: ue } = await supabase
    .from('family_members')
    .update({ expires_at: newExpiry.toISOString(), last_resent_at: now.toISOString() })
    .eq('id', memberId)
  if (ue) return { error: ue.message }

  const emailResult = await sendInviteEmail(
    inv.invited_email ?? '',
    (inv.role as FamilyRole) || 'member',
    inv.pessoa_name ?? undefined,
    {
      id: inv.family_id,
      name: inv.family_groups?.name ?? null,
      owner_id: inv.family_groups?.owner_id ?? user.id,
    },
  )
  return { data: { ...inv, expires_at: newExpiry.toISOString() }, emailResult }
}

export async function removeMember(memberId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('family_members').delete().eq('id', memberId)
  return error ? { error: error.message } : {}
}

/** Cancelar convite pendente — alias de remove só pra clareza semântica. */
export async function cancelInvite(memberId: string): Promise<{ error?: string }> {
  return removeMember(memberId)
}

// ── accept ────────────────────────────────────────────────────────────

/**
 * Aceita o convite pendente do user logado. Não há edge dedicada —
 * a porta de aceitação é client-side (mesma lógica do Dino):
 * casa email + family_members.invited_email e preenche user_id+accepted_at.
 *
 * Se o token for fornecido (rota /aceitar/:token), tentamos usá-lo como
 * id do row em family_members; se não, usamos o email do user logado.
 */
export async function acceptInvite(
  tokenOrInviteId?: string,
): Promise<
  { ok: true; invite: FamilyMemberRow } | { expired: true; invite: FamilyMemberRow } | { error: string }
> {
  const user = await currentUser()
  if (!user) return { error: 'Você precisa fazer login pra aceitar o convite' }
  const email = user.email
  if (!email) return { error: 'Sessão sem e-mail' }

  let query = supabase
    .from('family_members')
    .select(
      'id, family_id, user_id, role, invited_email, pessoa_name, accepted_at, created_at, expires_at, last_resent_at',
    )
    .is('accepted_at', null)

  if (tokenOrInviteId) {
    query = query.eq('id', tokenOrInviteId)
  } else {
    query = query.eq('invited_email', email)
  }
  const { data: invite } = await query.maybeSingle()
  if (!invite) return { error: 'Convite não encontrado ou já aceito' }

  const inv = invite as FamilyMemberRow
  // Quando vier por token, garantimos que o email do user bate com o convite —
  // evita que um link vazado seja aceito por outro user.
  if (tokenOrInviteId && inv.invited_email && inv.invited_email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'Este convite é pra outro e-mail' }
  }
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { expired: true, invite: inv }
  }

  const { error } = await supabase
    .from('family_members')
    .update({ user_id: user.id, accepted_at: new Date().toISOString() })
    .eq('id', inv.id)
  if (error) return { error: error.message }
  return { ok: true, invite: inv }
}

// ── data owner resolution (multi-user blob scoping) ─────────────────
//
// O blob `user_data` é indexado por user_id. Pra família funcionar,
// membros precisam ler/escrever no blob do family head (não no próprio).
// Esta função resolve, pro user logado, qual user_id detém o blob:
//   - head/solo  → o próprio uid
//   - membro     → head_user_id da família
//
// Cache em memória da sessão (sem persistência cross-reload) — invalidado
// via invalidateDataOwnerCache() quando a composição da família muda.

const _dataOwnerCache = new Map<string, string>()

export function invalidateDataOwnerCache(myUserId?: string): void {
  if (myUserId) _dataOwnerCache.delete(myUserId)
  else _dataOwnerCache.clear()
}

export async function resolveDataOwnerId(myUserId: string): Promise<string> {
  if (!myUserId) return myUserId
  const cached = _dataOwnerCache.get(myUserId)
  if (cached) return cached

  // É membro aceito de alguma família? Pega o head dela.
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, family_groups(owner_id)')
    .eq('user_id', myUserId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  const m = membership as unknown as {
    family_id: string
    family_groups: { owner_id: string } | null
  } | null
  const ownerId = m?.family_groups?.owner_id ?? myUserId
  _dataOwnerCache.set(myUserId, ownerId)
  return ownerId
}

// ── family context (scope: am I owner or member?) ────────────────────

/**
 * Resolve o contexto de família do user logado.
 * - Owner de uma família  → { role: 'admin', dataOwnerUserId: self }
 * - Membro de uma família → { role, dataOwnerUserId: ownerId }
 * - Nenhuma das duas      → null
 *
 * Espelha resolveFamilyContext() do Dino (supabase-client.js).
 */
export async function resolveFamilyContext(): Promise<FamilyContext | null> {
  const user = await currentUser()
  if (!user) return null
  // owner?
  const { data: ownedGroup } = await supabase
    .from('family_groups')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (ownedGroup) {
    return {
      groupId: ownedGroup.id,
      ownerId: user.id,
      role: 'admin',
      dataOwnerUserId: user.id,
    }
  }
  // member?
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role, pessoa_name, family_groups(owner_id)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle()
  if (membership) {
    const m = membership as unknown as {
      family_id: string
      role: string
      pessoa_name: string | null
      family_groups: { owner_id: string } | null
    }
    const ownerId = m.family_groups?.owner_id ?? user.id
    return {
      groupId: m.family_id,
      ownerId,
      role: m.role,
      dataOwnerUserId: ownerId,
      pessoaName: m.pessoa_name,
    }
  }
  return null
}

// ── email transactional (via edge family-invite) ─────────────────────

async function sendInviteEmail(
  email: string,
  role: FamilyRole | string,
  pessoaName: string | undefined,
  group: { id: string; name: string | null; owner_id?: string },
): Promise<InviteEmailResult> {
  try {
    const { data: sess } = await supabase.auth.getSession()
    const accessToken = sess.session?.access_token
    if (!accessToken) {
      return { sent: false, alreadyExists: false, error: 'sessão expirada — faça login novamente' }
    }
    const user = sess.session?.user
    // Best-effort no nome do convidador — sem Store global, usamos o email.
    const inviterName =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      (user?.email ? user.email.split('@')[0] : null) ||
      'Alguém'

    const payload = {
      email,
      role,
      pessoaName,
      inviterName,
      familyName: group.name,
      familyId: group.id,
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    }

    const { data, error } = await supabase.functions.invoke('family-invite', {
      body: payload,
    })

    if (error) {
      // Algumas falhas vêm com payload de "alreadyExists" e status 200,
      // mas se chegou aqui é erro real do invoke (rede/4xx/5xx).
      console.warn('[family.invite] edge error', error)
      const body = (data ?? null) as InviteEmailResult | null
      if (body?.alreadyExists) return body
      return { sent: false, alreadyExists: false, error: error.message }
    }
    return (data ?? { sent: true }) as InviteEmailResult
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[family.invite] exception', msg)
    return { sent: false, alreadyExists: false, error: msg }
  }
}
