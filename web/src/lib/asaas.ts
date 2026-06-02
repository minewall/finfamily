import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

// ──────────────────────────────────────────────────────────────────────
// Tipos (espelham o schema acordado em public.plans / subscriptions / invoices)
// ──────────────────────────────────────────────────────────────────────

export type Tier = 'base' | 'premium'
export type BillingInterval = 'monthly' | 'annual'
export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'refunded'
  | 'canceled'
  | 'failed'

export interface Plan {
  id: string
  tier: Tier
  billing_interval: BillingInterval
  name: string
  amount_cents: number
  currency: string
  is_active: boolean
  features: Record<string, unknown>
  sort_order: number
}

export interface Subscription {
  id: string
  user_id: string
  family_id: string | null
  plan_id: string | null
  tier: Tier
  status: SubscriptionStatus
  trial_start_at: string | null
  trial_end_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  asaas_customer_id: string | null
  asaas_subscription_id: string | null
  billing_cycle: BillingInterval | null
  next_due_date: string | null
  cancel_reason: string | null
}

export interface Invoice {
  id: string
  user_id: string
  subscription_id: string | null
  asaas_payment_id: string
  amount_cents: number
  status: InvoiceStatus
  billing_type: string | null
  due_date: string | null
  paid_at: string | null
  invoice_url: string | null
  pix_qr_code: string | null
  description: string | null
  created_at: string
}

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

// ──────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────

export function useSubscription(): AsyncState<Subscription | null> {
  const [data, setData] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) {
      setData(null)
      setLoading(false)
      return
    }
    const { data: row, error: err } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (err) {
      setError(err.message)
      setData(null)
    } else {
      setData((row as Subscription | null) ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}

export function usePlans(): AsyncState<Plan[]> {
  const [data, setData] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: rows, error: err } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
      setData([])
    } else {
      setData((rows as Plan[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}

export function useInvoices(): AsyncState<Invoice[]> {
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) {
      setData([])
      setLoading(false)
      return
    }
    const { data: rows, error: err } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setData([])
    } else {
      setData((rows as Invoice[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}

// ──────────────────────────────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────────────────────────────

interface CheckoutResponse {
  checkoutUrl: string
  status?: string
  asaasSubscriptionId?: string
}

export async function createCheckout(planId: string): Promise<CheckoutResponse> {
  const { data, error } = await supabase.functions.invoke('asaas-create-checkout', {
    body: { planId },
  })
  if (error) throw new Error(error.message)
  const payload = data as CheckoutResponse | null
  if (!payload?.checkoutUrl) throw new Error('Resposta sem checkoutUrl.')
  return payload
}

/**
 * Marca a assinatura pra cancelar no fim do período.
 * TODO: integrar com edge function `asaas-cancel` quando disponível para
 * propagar pro provedor. Por enquanto só atualiza a linha local.
 */
export async function cancelSubscriptionAtPeriodEnd(reason: string | null) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('Sem sessão.')
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      cancel_reason: reason,
    })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

export function planLabel(p: Pick<Plan, 'tier' | 'billing_interval'>): string {
  const tierLabel = p.tier === 'premium' ? 'Premium' : 'Base'
  const cycleLabel = p.billing_interval === 'annual' ? 'Anual' : 'Mensal'
  return `${tierLabel} · ${cycleLabel}`
}

export function tierLabel(t: Tier): string {
  return t === 'premium' ? 'Premium' : 'Base'
}

export function statusLabel(s: SubscriptionStatus): string {
  switch (s) {
    case 'trial':
      return 'Em trial'
    case 'active':
      return 'Ativa'
    case 'past_due':
      return 'Em atraso'
    case 'cancelled':
      return 'Cancelada'
    case 'expired':
      return 'Expirada'
  }
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  const now = Date.now()
  if (Number.isNaN(target)) return null
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)))
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function monthlyEquivalentCents(p: Plan): number {
  return p.billing_interval === 'annual' ? Math.round(p.amount_cents / 12) : p.amount_cents
}
