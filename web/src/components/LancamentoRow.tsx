// Linha de lançamento polida (Track R). Avatar + descrição/subcat,
// pílula de categoria, status badge, valor monoespaçado.
//
// Usada em /lancamentos, /receitas e /despesas. Mantém o comportamento
// de "clique direto" — a linha inteira é clicável e abre o LancamentoModal.

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import {
  currencyBRL,
  getCategoryLabel,
  type UnifiedLancamento,
  type UserData,
} from '@haile/shared'
import {
  avatarColor,
  avatarInitial,
  categoriaColor,
  lancamentoStatus,
  type LancamentoStatus,
} from '@/lib/lancamento-utils'

interface LancamentoRowProps {
  item: UnifiedLancamento
  data?: UserData | null
  onClick: () => void
}

const STATUS_META: Record<LancamentoStatus, {
  label: string
  cls: string
  Icon: typeof CheckCircle2
}> = {
  agendado: {
    label: 'Agendado',
    cls: 'bg-amber/15 text-amber',
    Icon: Clock,
  },
  pago: {
    label: 'Pago',
    cls: 'bg-green/15 text-green',
    Icon: CheckCircle2,
  },
  atrasado: {
    label: 'Atrasado',
    cls: 'bg-red/15 text-red',
    Icon: AlertCircle,
  },
}

export function LancamentoRow({ item, data, onClick }: LancamentoRowProps) {
  const status = lancamentoStatus(item)
  const meta = STATUS_META[status]
  const catLabel = getCategoryLabel(item.category)
  const catColor = categoriaColor(item.category, data)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left last:border-b-0 hover:bg-elevated/30 focus:outline-none focus:bg-elevated/40"
    >
      {/* Avatar pessoa */}
      <div
        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
        style={{ background: avatarColor(item.person) }}
        title={item.person ?? ''}
        aria-label={item.person ?? 'sem pessoa'}
      >
        {avatarInitial(item.person)}
      </div>

      {/* Descrição + subcategoria */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{item.desc || '—'}</div>
        <div className="truncate text-xs text-mist">
          {catLabel}
          {item.sub ? ` · ${item.sub}` : ''}
        </div>
      </div>

      {/* Badge categoria pill — escondida em mobile pra não estourar */}
      <span
        className="hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block"
        style={{ background: `${catColor}26`, color: catColor }}
        title={catLabel}
      >
        {catLabel}
      </span>

      {/* Status badge */}
      <span
        className={`hidden flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium md:inline-flex ${meta.cls}`}
        title={meta.label}
      >
        <meta.Icon size={11} aria-hidden />
        {meta.label}
      </span>

      {/* Valor */}
      <div
        className={
          'flex-shrink-0 font-mono text-sm font-bold ' +
          (item.amountSigned >= 0 ? 'text-green' : 'text-red')
        }
      >
        {item.amountSigned >= 0 ? '+' : '−'} {currencyBRL(item.amount)}
      </div>
    </button>
  )
}
