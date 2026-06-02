import { useState } from 'react'
import { RefreshCw, DollarSign } from 'lucide-react'
import { useData } from '@/store/useData'

interface Props {
  className?: string
}

function fmtBRL(n?: number): string {
  if (!n || !Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtBTC(n?: number): string {
  if (!n || !Number.isFinite(n)) return '—'
  if (n >= 1000) return Math.round(n).toLocaleString('pt-BR')
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/**
 * Pequeno indicador "USD: R$ 5,21 · BTC: R$ 350.000". Clicar força refresh.
 * Pode ser inserido em qualquer header.
 */
export function CotacoesIndicator({ className }: Props) {
  const cotacoes = useData((s) => s.data?.cotacoes)
  const refreshCotacoes = useData((s) => s.refreshCotacoes)
  const [busy, setBusy] = useState(false)

  async function handleRefresh() {
    if (busy) return
    setBusy(true)
    try {
      await refreshCotacoes()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleRefresh()}
      disabled={busy}
      title={
        cotacoes?._updatedAt
          ? `Atualizado em ${new Date(cotacoes._updatedAt).toLocaleString('pt-BR')}`
          : 'Buscar cotações'
      }
      className={
        'inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-mist hover:text-ink disabled:opacity-60 ' +
        (className ?? '')
      }
    >
      <DollarSign size={12} className="text-green" />
      <span>USD: R$ {fmtBRL(cotacoes?.USD)}</span>
      <span className="text-faint">·</span>
      <span>BTC: R$ {fmtBTC(cotacoes?.BTC)}</span>
      <RefreshCw size={11} className={busy ? 'animate-spin' : ''} />
    </button>
  )
}
