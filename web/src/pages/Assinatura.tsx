import { useMemo, useState } from 'react'
import {
  Crown,
  Check,
  X as XIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  XCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { currencyBRL } from '@haile/shared'
import {
  useSubscription,
  usePlans,
  useInvoices,
  createCheckout,
  cancelSubscriptionAtPeriodEnd,
  tierLabel,
  daysUntil,
  formatDateBR,
  monthlyEquivalentCents,
  type Plan,
  type Subscription,
  type Invoice,
  type SubscriptionStatus,
  type InvoiceStatus,
} from '@/lib/asaas'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

const CANCEL_REASONS: Array<{ id: string; label: string }> = [
  { id: 'preco', label: 'Custo alto' },
  { id: 'uso', label: 'Não estou usando' },
  { id: 'outro', label: 'Outro motivo' },
]

interface FeatureRow {
  key: string
  label: string
  /** Quando true, o feature ATIVO no plano significa "vantagem ausente"
   * (ex: `limite_interacao_diaria=true` é restrição, não benefício). */
  invert?: boolean
}

const FEATURE_KEYS: FeatureRow[] = [
  { key: 'import_extratos', label: 'Importar extratos (OFX/CSV/PDF)' },
  { key: 'open_finance', label: 'Open Finance (sincronização bancária)' },
  { key: 'limite_interacao_diaria', label: 'Interações ilimitadas com a Haile', invert: true },
]

export default function Assinatura() {
  const subQ = useSubscription()
  const plansQ = usePlans()
  const invQ = useInvoices()

  const [showSelector, setShowSelector] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelErr, setCancelErr] = useState<string | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null)

  const sub = subQ.data
  const plans = plansQ.data
  const invoices = invQ.data

  const currentPlan = useMemo<Plan | null>(() => {
    if (!sub?.plan_id) return null
    return plans.find((p) => p.id === sub.plan_id) ?? null
  }, [sub, plans])

  // Sem assinatura ainda? Mostra direto o seletor de planos (estado pré-checkout).
  const noSubscription = !subQ.loading && !sub
  const expandSelector = showSelector || noSubscription || sub?.status === 'trial'

  async function handleCheckout(planId: string) {
    setCheckoutErr(null)
    setCheckoutBusy(planId)
    try {
      const r = await createCheckout(planId)
      window.location.href = r.checkoutUrl
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Falha ao iniciar checkout.')
      setCheckoutBusy(null)
    }
  }

  async function handleConfirmCancel() {
    setCancelErr(null)
    setCancelBusy(true)
    try {
      const reasonLabel =
        CANCEL_REASONS.find((r) => r.id === cancelReason)?.label ?? null
      await cancelSubscriptionAtPeriodEnd(reasonLabel)
      await subQ.reload()
      setShowCancel(false)
      setCancelReason('')
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message : 'Falha ao cancelar.')
    } finally {
      setCancelBusy(false)
    }
  }

  const loading = subQ.loading || plansQ.loading

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-ink md:text-3xl">Assinatura</h1>
        <p className="mt-1 text-sm text-mist">Gerencie seu plano e cobranças.</p>
      </header>

      {loading && <PlanoAtualSkeleton />}

      {!loading && (
        <div className="space-y-6">
          <PlanoAtualCard
            sub={sub}
            plan={currentPlan}
            onOpenSelector={() => setShowSelector((v) => !v)}
            onCancel={() => setShowCancel(true)}
            selectorOpen={expandSelector}
          />

          {(subQ.error || plansQ.error) && (
            <div className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {subQ.error ?? plansQ.error}
              <button
                type="button"
                onClick={() => {
                  void subQ.reload()
                  void plansQ.reload()
                }}
                className="ml-3 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {expandSelector && (
            <SeletorPlanos
              plans={plans}
              currentPlanId={sub?.plan_id ?? null}
              checkoutBusy={checkoutBusy}
              checkoutErr={checkoutErr}
              onChoose={handleCheckout}
            />
          )}

          <HistoricoCobrancas invoices={invoices} loading={invQ.loading} error={invQ.error} />

          <SuporteCard />
        </div>
      )}

      <CancelModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={() => void handleConfirmCancel()}
        busy={cancelBusy}
        error={cancelErr}
        periodEnd={sub?.current_period_end ?? sub?.trial_end_at ?? null}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Card 1 — Plano atual (hero)
// ──────────────────────────────────────────────────────────────────────

interface PlanoAtualCardProps {
  sub: Subscription | null
  plan: Plan | null
  selectorOpen: boolean
  onOpenSelector: () => void
  onCancel: () => void
}

function PlanoAtualCard({ sub, plan, selectorOpen, onOpenSelector, onCancel }: PlanoAtualCardProps) {
  if (!sub) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo to-teal text-white">
            <Sparkles size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-ink">Comece com 21 dias grátis</h2>
            <p className="mt-1 text-sm text-mist">
              Escolha um plano abaixo e libere a Haile por completo. Sem cobrança durante o trial.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const isTrial = sub.status === 'trial'
  const cancelled = sub.status === 'cancelled' || sub.cancel_at_period_end
  const daysLeft = isTrial ? daysUntil(sub.trial_end_at) : null
  const nextDate = sub.next_due_date ?? sub.current_period_end ?? sub.trial_end_at
  const cycle = sub.billing_cycle ?? plan?.billing_interval ?? null

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'grid h-12 w-12 place-items-center rounded-xl text-white',
              sub.tier === 'premium'
                ? 'bg-gradient-to-br from-indigo to-teal'
                : 'bg-indigo',
            )}
            aria-hidden
          >
            {sub.tier === 'premium' ? <Crown size={22} /> : <Sparkles size={22} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink">
                Haile {tierLabel(sub.tier)}
              </h2>
              <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancel_at_period_end} />
            </div>
            <p className="mt-1 text-sm text-mist">
              {isTrial && daysLeft !== null && (
                <>Trial em andamento — {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}.</>
              )}
              {!isTrial && cancelled && nextDate && (
                <>Acesso liberado até {formatDateBR(nextDate)}.</>
              )}
              {!isTrial && !cancelled && plan && (
                <>
                  Cobrança {cycle === 'annual' ? 'anual' : 'mensal'} de{' '}
                  <strong className="text-ink">{currencyBRL(plan.amount_cents / 100)}</strong>
                  {cycle === 'annual' && (
                    <>
                      {' '}(~{currencyBRL(monthlyEquivalentCents(plan) / 100)}/mês)
                    </>
                  )}
                </>
              )}
            </p>
            {!isTrial && !cancelled && nextDate && plan && (
              <p className="mt-1 text-xs text-mist">
                Próxima cobrança: {formatDateBR(nextDate)} ·{' '}
                {currencyBRL(plan.amount_cents / 100)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <Button
            type="button"
            variant="primary"
            onClick={onOpenSelector}
            className="w-full md:w-auto"
          >
            {selectorOpen ? 'Ocultar planos' : 'Mudar plano'}
          </Button>
          {!cancelled && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-mist underline-offset-2 hover:text-ink hover:underline"
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function PlanoAtualSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
    </div>
  )
}

function StatusBadge({
  status,
  cancelAtPeriodEnd,
}: {
  status: SubscriptionStatus
  cancelAtPeriodEnd: boolean
}) {
  let label: string
  let cls: string
  if (cancelAtPeriodEnd && status !== 'cancelled' && status !== 'expired') {
    label = 'Cancela no fim do período'
    cls = 'bg-amber/15 text-amber'
  } else {
    switch (status) {
      case 'trial':
        label = 'Trial'
        cls = 'bg-teal/15 text-teal'
        break
      case 'active':
        label = 'Ativa'
        cls = 'bg-green/15 text-green'
        break
      case 'past_due':
        label = 'Em atraso'
        cls = 'bg-red/15 text-red'
        break
      case 'cancelled':
        label = 'Cancelada'
        cls = 'bg-mist/20 text-mist'
        break
      case 'expired':
        label = 'Expirada'
        cls = 'bg-mist/20 text-mist'
        break
    }
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', cls)}>
      {label}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Card 2 — Seletor de planos
// ──────────────────────────────────────────────────────────────────────

interface SeletorPlanosProps {
  plans: Plan[]
  currentPlanId: string | null
  checkoutBusy: string | null
  checkoutErr: string | null
  onChoose: (planId: string) => void
}

function SeletorPlanos({ plans, currentPlanId, checkoutBusy, checkoutErr, onChoose }: SeletorPlanosProps) {
  if (!plans.length) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm text-mist">Nenhum plano ativo no momento.</p>
      </section>
    )
  }
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="font-serif text-xl text-ink">Escolha seu plano</h3>
      <p className="mt-1 text-sm text-mist">
        Vamos junto pro Premium? Você pode mudar de ideia a qualquer momento.
      </p>

      {checkoutErr && (
        <div className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {checkoutErr}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            isCurrent={p.id === currentPlanId}
            busy={checkoutBusy === p.id}
            disabled={checkoutBusy !== null && checkoutBusy !== p.id}
            onChoose={() => onChoose(p.id)}
          />
        ))}
      </div>
    </section>
  )
}

function PlanCard({
  plan,
  isCurrent,
  busy,
  disabled,
  onChoose,
}: {
  plan: Plan
  isCurrent: boolean
  busy: boolean
  disabled: boolean
  onChoose: () => void
}) {
  const isAnnual = plan.billing_interval === 'annual'
  const monthly = monthlyEquivalentCents(plan)
  const features = plan.features ?? {}

  function renderFeature(key: string, label: string, invert = false) {
    const raw = (features as Record<string, unknown>)[key]
    const value = typeof raw === 'boolean' ? raw : false
    const enabled = invert ? !value : value
    return (
      <li key={key} className="flex items-start gap-2 text-sm">
        {enabled ? (
          <Check size={16} className="mt-0.5 shrink-0 text-green" />
        ) : (
          <XIcon size={16} className="mt-0.5 shrink-0 text-mist" />
        )}
        <span className={enabled ? 'text-ink' : 'text-mist line-through'}>{label}</span>
      </li>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-5 transition-colors',
        plan.tier === 'premium'
          ? 'border-indigo/40 bg-gradient-to-br from-indigo/5 to-teal/5'
          : 'border-line bg-elevated',
        isCurrent && 'ring-2 ring-indigo/60',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {plan.tier === 'premium' && <Crown size={16} className="text-indigo" />}
          <span className="text-sm font-bold uppercase tracking-wide text-mist">
            {tierLabel(plan.tier)} · {isAnnual ? 'Anual' : 'Mensal'}
          </span>
        </div>
        {isCurrent && (
          <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo">
            Atual
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="font-serif text-2xl text-ink">
          {currencyBRL(plan.amount_cents / 100)}
          <span className="text-sm font-sans font-normal text-mist">
            {' '}/ {isAnnual ? 'ano' : 'mês'}
          </span>
        </div>
        {isAnnual && (
          <p className="text-xs text-mist">
            ~{currencyBRL(monthly / 100)} por mês
          </p>
        )}
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {FEATURE_KEYS.map((f) => renderFeature(f.key, f.label, f.invert === true))}
      </ul>

      <button
        type="button"
        onClick={onChoose}
        disabled={isCurrent || busy || disabled}
        className={cn(
          'mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
          isCurrent
            ? 'cursor-default border border-line bg-elevated text-mist'
            : 'bg-indigo text-white hover:bg-indigo-deep disabled:opacity-60',
        )}
      >
        {isCurrent ? 'Plano atual' : busy ? 'Abrindo checkout…' : 'Assinar este plano'}
        {!isCurrent && !busy && <ChevronRight size={16} />}
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Card 3 — Histórico de cobranças
// ──────────────────────────────────────────────────────────────────────

function HistoricoCobrancas({
  invoices,
  loading,
  error,
}: {
  invoices: Invoice[]
  loading: boolean
  error: string | null
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="font-serif text-xl text-ink">Histórico de cobranças</h3>

      {loading && (
        <div className="mt-4 space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-elevated" />
          <div className="h-10 animate-pulse rounded-lg bg-elevated" />
          <div className="h-10 animate-pulse rounded-lg bg-elevated" />
        </div>
      )}

      {!loading && error && (
        <p className="mt-3 text-sm text-red">Erro ao carregar: {error}</p>
      )}

      {!loading && !error && invoices.length === 0 && (
        <p className="mt-3 text-sm text-mist">
          Sem cobranças ainda. Assim que sua assinatura começar, elas aparecem aqui.
        </p>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-mist">
                <th className="py-2 pr-4">Data</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Forma</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} inv={inv} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const dateIso = inv.due_date ?? inv.created_at
  return (
    <tr className="border-b border-line/60 last:border-b-0">
      <td className="py-3 pr-4 text-ink">{formatDateBR(dateIso)}</td>
      <td className="py-3 pr-4 font-medium text-ink">
        {currencyBRL(inv.amount_cents / 100)}
      </td>
      <td className="py-3 pr-4">
        <InvoiceStatusPill status={inv.status} />
      </td>
      <td className="py-3 pr-4 text-mist">{billingTypeLabel(inv.billing_type)}</td>
      <td className="py-3 text-right">
        {(inv.status === 'pending' || inv.status === 'overdue') && inv.invoice_url && (
          <a
            href={inv.invoice_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:underline"
          >
            Pagar <ExternalLink size={12} />
          </a>
        )}
        {inv.status === 'paid' && inv.invoice_url && (
          <a
            href={inv.invoice_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-mist hover:text-ink hover:underline"
          >
            Recibo <ExternalLink size={12} />
          </a>
        )}
      </td>
    </tr>
  )
}

function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<
    InvoiceStatus,
    { label: string; icon: typeof CheckCircle; cls: string }
  > = {
    paid: { label: 'Pago', icon: CheckCircle, cls: 'bg-green/15 text-green' },
    pending: { label: 'Pendente', icon: Clock, cls: 'bg-amber/15 text-amber' },
    overdue: { label: 'Vencido', icon: AlertCircle, cls: 'bg-red/15 text-red' },
    refunded: { label: 'Reembolsado', icon: RotateCcw, cls: 'bg-mist/20 text-mist' },
    canceled: { label: 'Cancelado', icon: XCircle, cls: 'bg-mist/20 text-mist' },
    failed: { label: 'Falhou', icon: XCircle, cls: 'bg-red/15 text-red' },
  }
  const m = map[status]
  const Icon = m.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        m.cls,
      )}
    >
      <Icon size={12} />
      {m.label}
    </span>
  )
}

function billingTypeLabel(t: string | null): string {
  if (!t) return '—'
  const u = t.toUpperCase()
  if (u === 'PIX') return 'Pix'
  if (u === 'BOLETO') return 'Boleto'
  if (u === 'CREDIT_CARD') return 'Cartão'
  if (u === 'UNDEFINED') return '—'
  return t
}

// ──────────────────────────────────────────────────────────────────────
// Card 4 — Suporte e LGPD
// ──────────────────────────────────────────────────────────────────────

function SuporteCard() {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="font-serif text-xl text-ink">Suporte</h3>
      <p className="mt-2 text-sm text-mist">
        Você pode cancelar a qualquer momento — mantém acesso até o fim do período pago.
        Para qualquer dúvida, fale com a gente.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="mailto:oi@haile.com.br?subject=Assinatura"
          className="inline-flex items-center gap-2 rounded-xl border border-line-2 px-4 py-2 text-sm font-semibold text-ink hover:bg-elevated"
        >
          <Mail size={16} />
          Falar com suporte
        </a>
        <span className="inline-flex items-center gap-2 rounded-xl bg-elevated px-4 py-2 text-xs text-mist">
          <ShieldCheck size={14} />
          Cobranças seguras via Asaas
        </span>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Modal de cancelamento
// ──────────────────────────────────────────────────────────────────────

interface CancelModalProps {
  open: boolean
  onClose: () => void
  reason: string
  onReasonChange: (id: string) => void
  onConfirm: () => void
  busy: boolean
  error: string | null
  periodEnd: string | null
}

function CancelModal({
  open,
  onClose,
  reason,
  onReasonChange,
  onConfirm,
  busy,
  error,
  periodEnd,
}: CancelModalProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Cancelar assinatura"
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Voltar
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        Você mantém acesso completo até{' '}
        <strong>{periodEnd ? formatDateBR(periodEnd) : 'o fim do período pago'}</strong>.
        Depois disso, a Haile pausa as cobranças.
      </p>

      <p className="mt-5 text-xs font-medium text-mist">
        Conta pra gente o motivo (opcional):
      </p>
      <fieldset className="mt-2 space-y-2">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm',
              reason === r.id
                ? 'border-indigo bg-indigo/5 text-ink'
                : 'border-line text-ink hover:bg-elevated',
            )}
          >
            <input
              type="radio"
              name="cancel-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => onReasonChange(r.id)}
              className="accent-indigo"
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="mt-4 rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-sm text-red">
          {error}
        </p>
      )}
    </Modal>
  )
}
