import { useState } from 'react'
import {
  DollarSign,
  Euro,
  Bitcoin,
  Coins,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import type { CotacaoSymbol, CotacoesAuto } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

interface MoedaDef {
  symbol: CotacaoSymbol
  nome: string
  grupo: 'fiat' | 'cripto'
  Icon: typeof DollarSign
}

const MOEDAS: MoedaDef[] = [
  { symbol: 'USD', nome: 'Dólar americano', grupo: 'fiat', Icon: DollarSign },
  { symbol: 'EUR', nome: 'Euro', grupo: 'fiat', Icon: Euro },
  { symbol: 'USDT', nome: 'Tether', grupo: 'cripto', Icon: Coins },
  { symbol: 'BTC', nome: 'Bitcoin', grupo: 'cripto', Icon: Bitcoin },
]

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS

function fmtBRL(n?: number): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  })
}

function relTime(iso: string | undefined, nowMs = Date.now()): string {
  if (!iso) return 'Nunca atualizado'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'Sem data'
  const diff = nowMs - t
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (diff < 60_000) return 'Agora há pouco'
  if (diff < HORA_MS) return rtf.format(-Math.round(diff / 60_000), 'minute')
  if (diff < DIA_MS) return rtf.format(-Math.round(diff / HORA_MS), 'hour')
  return rtf.format(-Math.round(diff / DIA_MS), 'day')
}

type Staleness = 'fresh' | 'warn' | 'stale'

function staleness(iso: string | undefined, alertaDias: number, nowMs = Date.now()): Staleness {
  if (!iso) return 'stale'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'stale'
  const ageMs = nowMs - t
  const warnMs = Math.max(1, alertaDias) * DIA_MS
  const staleMs = warnMs * 3
  if (ageMs >= staleMs) return 'stale'
  if (ageMs >= warnMs) return 'warn'
  return 'fresh'
}

function tsFor(c: CotacoesAuto | undefined, sym: CotacaoSymbol): string | undefined {
  return c?._updatedAtPer?.[sym] ?? c?._updatedAt
}

export function CotacoesSection() {
  const cotacoes = useData((s) => s.data?.cotacoes)
  const refreshAll = useData((s) => s.refreshCotacoes)
  const refreshOne = useData((s) => s.refreshCotacaoUnica)
  const getSetting = useData((s) => s.getSetting)
  const setSetting = useData((s) => s.setSetting)
  const data = useData((s) => s.data)
  void data // re-render quando blob muda

  const alertaDias = Math.max(
    1,
    Number(getSetting<number>('cotacoesAlertaDias', 1)) || 1,
  )

  const [busyAll, setBusyAll] = useState(false)
  const [busyOne, setBusyOne] = useState<Record<CotacaoSymbol, boolean>>({
    USD: false,
    EUR: false,
    USDT: false,
    BTC: false,
  })
  const [error, setError] = useState<string | null>(null)

  async function handleRefreshAll() {
    if (busyAll) return
    setError(null)
    setBusyAll(true)
    try {
      const r = await refreshAll()
      if (!r) setError('Não foi possível atualizar — verifique sua conexão.')
    } finally {
      setBusyAll(false)
    }
  }

  async function handleRefreshOne(sym: CotacaoSymbol) {
    if (busyOne[sym]) return
    setError(null)
    setBusyOne((s) => ({ ...s, [sym]: true }))
    try {
      const r = await refreshOne(sym)
      if (!r) setError(`Falha ao atualizar ${sym}.`)
    } finally {
      setBusyOne((s) => ({ ...s, [sym]: false }))
    }
  }

  const fiats = MOEDAS.filter((m) => m.grupo === 'fiat')
  const criptos = MOEDAS.filter((m) => m.grupo === 'cripto')

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Cotações</h2>
        <p className="mt-1 text-sm text-mist">
          Cotações automáticas atualizadas via fontes públicas. Use no Patrimônio (USD, EUR, BTC, USDT).
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="text-xs text-mist">
            Fontes: <span className="text-ink">AwesomeAPI</span> (fiat) e{' '}
            <span className="text-ink">CoinGecko</span> (cripto).
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleRefreshAll} disabled={busyAll}>
          <RefreshCw size={14} className={busyAll ? 'animate-spin' : ''} />
          Atualizar todas
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Moedas fiat</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {fiats.map((m) => (
            <CotacaoCard
              key={m.symbol}
              moeda={m}
              valor={cotacoes?.[m.symbol]}
              ts={tsFor(cotacoes, m.symbol)}
              alertaDias={alertaDias}
              busy={busyOne[m.symbol]}
              onRefresh={() => void handleRefreshOne(m.symbol)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Criptoativos</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {criptos.map((m) => (
            <CotacaoCard
              key={m.symbol}
              moeda={m}
              valor={cotacoes?.[m.symbol]}
              ts={tsFor(cotacoes, m.symbol)}
              alertaDias={alertaDias}
              busy={busyOne[m.symbol]}
              onRefresh={() => void handleRefreshOne(m.symbol)}
            />
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink">Alerta de cotação desatualizada</h3>
        <p className="mt-1 text-xs text-mist">
          Mostramos um aviso visual quando a cotação ficar parada por mais tempo do que isso.
          Mais de 3x esse valor marca como crítico.
        </p>
        <div className="mt-4 max-w-xs">
          <Field label="Dias para alerta" hint="Padrão: 1 dia.">
            <Input
              type="number"
              min={1}
              max={90}
              step={1}
              value={alertaDias}
              onChange={(e) => {
                const n = Math.max(1, Math.min(90, Math.round(Number(e.target.value) || 1)))
                setSetting('cotacoesAlertaDias', n)
              }}
            />
          </Field>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

interface CardProps {
  moeda: MoedaDef
  valor: number | undefined
  ts: string | undefined
  alertaDias: number
  busy: boolean
  onRefresh: () => void
}

function CotacaoCard({ moeda, valor, ts, alertaDias, busy, onRefresh }: CardProps) {
  const state = staleness(ts, alertaDias)
  const borderClass =
    state === 'stale'
      ? 'border-red/60'
      : state === 'warn'
        ? 'border-amber/60'
        : 'border-line'
  const Icon = moeda.Icon

  return (
    <div className={cn('rounded-2xl border bg-surface p-5 transition-colors', borderClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-elevated">
            <Icon size={18} className="text-ink" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">{moeda.symbol}</div>
            <div className="text-xs text-mist">{moeda.nome}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          aria-label={`Atualizar ${moeda.symbol}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line-2 bg-bg text-mist transition-colors hover:text-ink disabled:opacity-50"
        >
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-semibold text-ink tabular-nums">{fmtBRL(valor)}</div>
        <div
          className={cn(
            'mt-1 flex items-center gap-1.5 text-xs',
            state === 'stale'
              ? 'text-red'
              : state === 'warn'
                ? 'text-amber'
                : 'text-mist',
          )}
        >
          {state !== 'fresh' && <AlertTriangle size={12} />}
          <span>{relTime(ts)}</span>
        </div>
      </div>

      {/* TODO: histórico/sparkline (fase futura) */}
    </div>
  )
}
