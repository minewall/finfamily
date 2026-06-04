import { Activity, Coins, PiggyBank, TrendingUp } from 'lucide-react'
import type { SaudeFinanceira, ClassificacaoSaude } from '@/lib/visao-geral-stats'

interface Props {
  saude: SaudeFinanceira
}

const COPY: Record<ClassificacaoSaude, { label: string; tone: string; ring: string; msg: string }> = {
  critica: {
    label: 'Crítica',
    tone: 'text-red',
    ring: 'ring-red/30',
    msg: 'Cuidado: vamos juntos retomar o equilíbrio.',
  },
  atencao: {
    label: 'Atenção',
    tone: 'text-amber',
    ring: 'ring-amber/30',
    msg: 'Atenção: aperte de mansinho.',
  },
  estavel: {
    label: 'Estável',
    tone: 'text-teal',
    ring: 'ring-teal/30',
    msg: 'Tudo bem por aqui.',
  },
  forte: {
    label: 'Forte',
    tone: 'text-green',
    ring: 'ring-green/30',
    msg: 'Bom momento — siga firme.',
  },
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function formatMeses(n: number): string {
  if (n <= 0) return '0 meses'
  if (n >= 12) return '12+ meses'
  if (n < 1) {
    const semanas = Math.max(1, Math.round(n * 4))
    return `${semanas} sem.`
  }
  const rounded = Math.round(n * 10) / 10
  return rounded === 1 ? '1 mês' : `${rounded} meses`
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-elevated/40 px-3 py-2">
      <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-surface text-indigo">
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate">{label}</div>
        <div className="font-mono text-sm font-bold text-ink">{value}</div>
      </div>
    </div>
  )
}

export default function SaudeFinanceiraCard({ saude }: Props) {
  const copy = COPY[saude.classificacao]

  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ring-1 ${copy.ring}`}>
      <div className="mb-4 flex items-center gap-2">
        <Activity size={16} className="text-indigo" strokeWidth={2.2} />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate">
          Saúde Financeira
        </h3>
      </div>

      <div className="flex items-baseline gap-3">
        <div className={`font-mono text-4xl font-extrabold ${copy.tone}`}>{saude.score}</div>
        <div className="text-xs text-mist">
          de 100 ·{' '}
          <span className={`font-semibold ${copy.tone}`}>{copy.label}</span>
        </div>
      </div>

      <p className="mt-2 text-sm text-mist">{copy.msg}</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <MiniStat
          icon={Coins}
          label="PdE / Receita"
          value={formatPct(saude.componentes.pdeSobreReceita)}
        />
        <MiniStat
          icon={PiggyBank}
          label="Reserva"
          value={formatMeses(saude.componentes.reservaSobreEssenciais)}
        />
        <MiniStat
          icon={TrendingUp}
          label="Saldo positivo"
          value={
            saude.componentes.sequenciaSaldoPositivo === 0
              ? '—'
              : saude.componentes.sequenciaSaldoPositivo === 1
                ? '1 mês'
                : `${saude.componentes.sequenciaSaldoPositivo} meses`
          }
        />
      </div>
    </div>
  )
}
