import { useEffect, useMemo, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react'
import {
  sumReceitas,
  sumDespesas,
  breakdownPorCategoria,
  currencyBRL,
  getCategoryLabel,
  getCategoryColor,
  type UserData,
} from '@haile/shared'
import { useData } from '@/store/useData'
import {
  StackedBars,
  type StackedBarsDatum,
  LineSeries,
  type LineSeriesDatum,
  DonutChart,
  type DonutChartDatum,
} from '@/components/charts'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface AnoSummary {
  monthly: Array<{ month: number; receita: number; despesa: number; saldo: number }>
  totalReceita: number
  totalDespesa: number
  saldo: number
  ticketMedio: number
}

function summarizeAno(data: UserData | null, year: number): AnoSummary {
  const d = data ?? ({} as UserData)
  const monthly: AnoSummary['monthly'] = []
  let totalReceita = 0
  let totalDespesa = 0
  for (let m = 1; m <= 12; m++) {
    const receita = sumReceitas(d, m, year)
    const despesa = sumDespesas(d, m, year)
    const saldo = receita - despesa
    monthly.push({ month: m, receita, despesa, saldo })
    totalReceita += receita
    totalDespesa += despesa
  }
  const saldo = totalReceita - totalDespesa
  // ticket médio = média de movimentação mensal (receita+despesa) / 12
  const ticketMedio = (totalReceita + totalDespesa) / 12
  return { monthly, totalReceita, totalDespesa, saldo, ticketMedio }
}

function categoriasNoAno(data: UserData | null, year: number) {
  const acc = new Map<string, { total: number; count: number }>()
  const d = data ?? ({} as UserData)
  for (let m = 1; m <= 12; m++) {
    const breakdown = breakdownPorCategoria(d, m, year)
    for (const c of breakdown) {
      const cur = acc.get(c.category) ?? { total: 0, count: 0 }
      cur.total += c.total
      cur.count += c.count
      acc.set(c.category, cur)
    }
  }
  const arr = [...acc.entries()]
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
  return arr
}

export default function Comparativo() {
  const { data, loading, error, load } = useData()

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [compararAnterior, setCompararAnterior] = useState(false)

  const atual = useMemo(() => summarizeAno(data, year), [data, year])
  const anterior = useMemo(() => summarizeAno(data, year - 1), [data, year])
  const categorias = useMemo(() => categoriasNoAno(data, year), [data, year])

  if (loading && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-mist">Carregando…</div>
  }
  if (error && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-red">Erro: {error}</div>
  }

  // Dados pro StackedBars (12 meses do ano atual)
  const stackedData: StackedBarsDatum[] = atual.monthly.map((m) => ({
    label: MESES_CURTOS[m.month - 1],
    receita: m.receita,
    despesa: m.despesa,
    saldo: m.saldo,
  }))

  // Saldo acumulado ao longo do ano
  const saldoAcumulado: LineSeriesDatum[] = (() => {
    let acc = 0
    return atual.monthly.map((m) => {
      acc += m.saldo
      return { label: MESES_CURTOS[m.month - 1], value: acc }
    })
  })()

  // Donut: despesas anuais por categoria
  const donutData: DonutChartDatum[] = categorias
    .filter((c) => c.total > 0)
    .map((c) => ({
      label: getCategoryLabel(c.category),
      value: c.total,
      color: getCategoryColor(c.category),
    }))

  const top5 = categorias.filter((c) => c.total > 0).slice(0, 5)

  // Comparativo simples ano vs ano anterior
  const diffReceita = atual.totalReceita - anterior.totalReceita
  const diffDespesa = atual.totalDespesa - anterior.totalDespesa
  const diffSaldo = atual.saldo - anterior.saldo

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <BarChart3 size={22} className="text-indigo" />
            Comparativo Anual
          </h1>
          <p className="text-sm text-mist">Como sua vida financeira se moveu em {year}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            aria-label="Ano"
          >
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ),
            )}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-mist">
            <input
              type="checkbox"
              checked={compararAnterior}
              onChange={(e) => setCompararAnterior(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo"
            />
            comparar com {year - 1}
          </label>
        </div>
      </header>

      {/* KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Receita anual"
          value={currencyBRL(atual.totalReceita)}
          tone="text-green"
          icon={<TrendingUp size={14} />}
          diff={compararAnterior ? diffReceita : undefined}
          higherIsBetter
        />
        <Kpi
          label="Despesa anual"
          value={currencyBRL(atual.totalDespesa)}
          tone="text-red"
          icon={<TrendingDown size={14} />}
          diff={compararAnterior ? diffDespesa : undefined}
          higherIsBetter={false}
        />
        <Kpi
          label="Saldo anual"
          value={currencyBRL(atual.saldo)}
          tone={atual.saldo >= 0 ? 'text-ink' : 'text-red'}
          icon={<Scale size={14} />}
          diff={compararAnterior ? diffSaldo : undefined}
          higherIsBetter
        />
        <Kpi
          label="Movimentação média/mês"
          value={currencyBRL(atual.ticketMedio)}
          tone="text-ink"
          icon={<Wallet size={14} />}
        />
      </section>

      {/* StackedBars 12 meses */}
      <section className="mb-6">
        <StackedBars
          data={stackedData}
          height={260}
          title={`Receita vs despesa — ${year}`}
        />
      </section>

      {/* Saldo acumulado */}
      <section className="mb-6">
        <LineSeries
          data={saldoAcumulado}
          height={220}
          title="Saldo acumulado no ano"
          color="#6b5ef5"
        />
      </section>

      {/* Donut + Top 5 */}
      <section className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DonutChart
          data={donutData}
          totalLabel={currencyBRL(atual.totalDespesa)}
          totalHint="Despesa anual"
          title="Onde foi o dinheiro"
          height={240}
        />

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate">
            Top 5 categorias do ano
          </h2>
          {top5.length === 0 ? (
            <p className="text-sm text-mist">Sem despesas registradas em {year}.</p>
          ) : (
            <ul className="space-y-3">
              {top5.map((c) => {
                const pct = atual.totalDespesa > 0 ? (c.total / atual.totalDespesa) * 100 : 0
                return (
                  <li key={c.category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: getCategoryColor(c.category) }}
                        />
                        <span className="text-ink">{getCategoryLabel(c.category)}</span>
                        <span className="text-faint">· {c.count}</span>
                      </span>
                      <span className="font-mono font-bold text-ink">
                        {currencyBRL(c.total)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: getCategoryColor(c.category),
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {compararAnterior && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
            Comparativo com {year - 1}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CompTile
              label="Receita"
              atual={atual.totalReceita}
              anterior={anterior.totalReceita}
              higherIsBetter
            />
            <CompTile
              label="Despesa"
              atual={atual.totalDespesa}
              anterior={anterior.totalDespesa}
              higherIsBetter={false}
            />
            <CompTile
              label="Saldo"
              atual={atual.saldo}
              anterior={anterior.saldo}
              higherIsBetter
            />
          </div>
        </section>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
  icon,
  diff,
  higherIsBetter,
}: {
  label: string
  value: string
  tone: string
  icon: React.ReactNode
  diff?: number
  higherIsBetter?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-extrabold ${tone}`}>{value}</div>
      {diff != null && (
        <div
          className={`mt-1 text-[11px] font-semibold ${
            isPositiveDirection(diff, higherIsBetter ?? true) ? 'text-green' : 'text-red'
          }`}
        >
          {diff >= 0 ? '+' : ''}{currencyBRL(diff)} vs ano anterior
        </div>
      )}
    </div>
  )
}

function CompTile({
  label,
  atual,
  anterior,
  higherIsBetter,
}: {
  label: string
  atual: number
  anterior: number
  higherIsBetter: boolean
}) {
  const diff = atual - anterior
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : 0
  const good = isPositiveDirection(diff, higherIsBetter)
  return (
    <div className="rounded-xl border border-line bg-elevated/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-bold text-ink">{currencyBRL(atual)}</span>
        <span className="text-[11px] text-mist">vs {currencyBRL(anterior)}</span>
      </div>
      <div className={`mt-1 text-[11px] font-semibold ${good ? 'text-green' : 'text-red'}`}>
        {diff >= 0 ? '+' : ''}{currencyBRL(diff)}
        {anterior !== 0 && (
          <span className="ml-1 text-faint">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
        )}
      </div>
    </div>
  )
}

function isPositiveDirection(diff: number, higherIsBetter: boolean): boolean {
  if (diff === 0) return true
  return higherIsBetter ? diff > 0 : diff < 0
}
