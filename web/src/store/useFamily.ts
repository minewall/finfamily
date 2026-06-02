import { create } from 'zustand'
import {
  acceptInvite as acceptInviteApi,
  cancelInvite as cancelInviteApi,
  inviteMember as inviteMemberApi,
  listFamilyMembers,
  listMyPendingInvites,
  removeMember as removeMemberApi,
  resendInvite as resendInviteApi,
  resolveFamilyContext,
  type FamilyContext,
  type FamilyMemberRow,
  type FamilyRole,
  type InviteResult,
} from '@/lib/family'

export type AcceptResult =
  | { ok: true; invite: FamilyMemberRow }
  | { expired: true; invite: FamilyMemberRow }
  | { error: string }

interface FamilyState {
  context: FamilyContext | null
  members: FamilyMemberRow[]      // owned family (caller é admin) — admin vê todos
  pendingInvites: FamilyMemberRow[]   // subset de members onde !accepted_at
  myPendingInvites: FamilyMemberRow[] // convites pra MIM (entrar na família de outro)
  loading: boolean
  error: string | null

  loadFamily: () => Promise<void>
  invite: (
    email: string,
    role?: FamilyRole,
    pessoaName?: string,
    options?: { sendEmail?: boolean },
  ) => Promise<InviteResult>
  remove: (memberId: string) => Promise<{ error?: string }>
  resend: (memberId: string) => Promise<InviteResult>
  cancel: (memberId: string) => Promise<{ error?: string }>
  accept: (tokenOrInviteId?: string) => Promise<AcceptResult>
}

export const useFamily = create<FamilyState>((set, get) => ({
  context: null,
  members: [],
  pendingInvites: [],
  myPendingInvites: [],
  loading: false,
  error: null,

  loadFamily: async () => {
    set({ loading: true, error: null })
    try {
      const [context, members, myPending] = await Promise.all([
        resolveFamilyContext(),
        listFamilyMembers(),
        listMyPendingInvites(),
      ])
      const pendingInvites = members.filter((m) => !m.accepted_at)
      set({ context, members, pendingInvites, myPendingInvites: myPending, loading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ loading: false, error: msg })
    }
  },

  invite: async (email, role = 'member', pessoaName, options) => {
    const res = await inviteMemberApi(email, role, pessoaName, options)
    if (!res.error) await get().loadFamily()
    return res
  },

  remove: async (memberId) => {
    const res = await removeMemberApi(memberId)
    if (!res.error) await get().loadFamily()
    return res
  },

  resend: async (memberId) => {
    const res = await resendInviteApi(memberId)
    if (!res.error) await get().loadFamily()
    return res
  },

  cancel: async (memberId) => {
    const res = await cancelInviteApi(memberId)
    if (!res.error) await get().loadFamily()
    return res
  },

  accept: async (tokenOrInviteId): Promise<AcceptResult> => {
    const res = await acceptInviteApi(tokenOrInviteId)
    if ('ok' in res && res.ok) await get().loadFamily()
    return res as AcceptResult
  },
}))
