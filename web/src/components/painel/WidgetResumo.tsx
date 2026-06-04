// Widget: Resumo Financeiro do mês corrente.
// Receitas, despesas e Poder de Escolha — números crus, sem julgamento.
import { TrendingUp, TrendingDown, Scale } from 'lucide-react'
import {
  currencyBRL,
  sumReceitas,
  sumDespesas,
  calcPoderDeEscolhaV2,
} from '@haile/shared'
import type { UserData } from '@haile/shared'

interface Props {
  data: UserData
}

export function WidgetResumo({ data }: Props) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const receitas = sumReceitas(data, month, year)
  const despesas = sumDespesas(data, month, year)
  const pde = calcPoderDeEscolhaV2(data, month, year).poderDeEscolha

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-indigo" />
        <h3 className="text-sm font-semibold text-ink">Resumo Financeiro</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<TrendingUp size={12} />}
          label="Receitas"
          value={currencyBRL(receitas)}
          tone="text-green"
        />
        <Stat
          icon={<TrendingDown size={12} />}
          label="Despesas"
          value={currencyBRL(despesas)}
          tone="text-red"
        />
        <Stat
          icon={<Scale size={12} />}
          label="Poder de Escolha"
          value={currencyBRL(pde)}
          tone={pde >= 0 ? 'text-green' : 'text-red'}
        />
      </div>

      <p className="mt-3 text-[11px] text-faint">
        Mês corrente. Poder de Escolha = receita menos piso de sobrevivência.
      </p>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-base font-extrabold ${tone}`}>{value}</div>
    </div>
  )
}
