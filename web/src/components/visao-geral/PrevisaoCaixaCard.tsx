import { LineChart, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { currencyBRL } from '@haile/shared'
import type { PrevisaoCaixa } from '@/lib/visao-geral-stats'

interface Props {
  previsao: PrevisaoCaixa
}

/** Mini-sparkline SVG inline — sem overhead Recharts. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 200
  const height = 56
  const padY = 4
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = padY + ((max - v) / range) * (height - padY * 2)
    return [x, y] as const
  })
  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`))
    .join(' ')
  // Área pra gradient
  const areaPath = `${path} L${(width).toFixed(1)},${height} L0,${height} Z`
  const gradientId = `sparkline-grad-${color.replace('#', '')}`
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block h-14 w-full"
      role="img"
      aria-label="Fluxo de caixa previsto pros próximos 30 dias"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PrevisaoCaixaCard({ previsao }: Props) {
  const delta = previsao.saldoFinal30d - previsao.saldoAtual
  const positivo = delta >= 0
  const corLinha = positivo ? '#1dc97e' : '#ef4444'
  const valores = previsao.fluxoDiario.map((p) => p.saldo)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <LineChart size={16} className="text-indigo" strokeWidth={2.2} />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate">
          Previsão de Caixa
        </h3>
        <span className="text-[10.5px] text-faint">· próximos 30 dias</span>
      </div>

      <div>
        <div className="font-mono text-2xl font-extrabold text-ink">
          {currencyBRL(previsao.saldoFinal30d)}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 font-mono font-semibold ${
              positivo ? 'text-green' : 'text-red'
            }`}
          >
            {positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {positivo ? '+' : '−'}
            {currencyBRL(Math.abs(delta))}
          </span>
          <span className="text-faint">vs saldo atual {currencyBRL(previsao.saldoAtual)}</span>
        </div>
      </div>

      <div className="mt-4">
        <Sparkline values={valores} color={corLinha} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div>
          <div className="text-faint">Receitas previstas</div>
          <div className="font-mono font-bold text-green">+{currencyBRL(previsao.receitasPrevistas)}</div>
        </div>
        <div className="text-right">
          <div className="text-faint">Saídas previstas</div>
          <div className="font-mono font-bold text-red">−{currencyBRL(previsao.despesasPrevistas)}</div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-mist">Sua previsão pros próximos 30 dias.</p>
    </div>
  )
}
