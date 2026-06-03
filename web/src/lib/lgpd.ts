import { supabase } from './supabase'

export type LgpdRequestType = 'export' | 'delete' | 'rectify' | 'object'
export type LgpdRequestStatus = 'pending' | 'completed' | 'rejected'

export type LgpdRequest = {
  id: string
  user_id: string
  user_email: string | null
  request_type: LgpdRequestType
  status: LgpdRequestStatus
  notes: string | null
  requested_at: string
  completed_at: string | null
}

export async function createLgpdRequest(
  type: LgpdRequestType,
  notes?: string,
): Promise<{ id: string }> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) throw userErr
  if (!user) throw new Error('Você precisa estar conectado pra fazer essa solicitação.')

  const { data, error } = await supabase
    .from('lgpd_requests')
    .insert({
      user_id: user.id,
      user_email: user.email ?? null,
      request_type: type,
      status: 'pending',
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id as string }
}

export async function listMyLgpdRequests(): Promise<LgpdRequest[]> {
  const { data, error } = await supabase
    .from('lgpd_requests')
    .select(
      'id, user_id, user_email, request_type, status, notes, requested_at, completed_at',
    )
    .order('requested_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return (data ?? []) as LgpdRequest[]
}
