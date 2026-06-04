import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  TrendingDown,
  PieChart as PieIcon,
  Users,
  Calendar,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  currencyBRL,
  getCategoryColor,
  getCategoryLabel,
  personColor,
  personInitial,
  type UnifiedLancamento,
  type Despesa,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { LancamentoModal } from '@/components/LancamentoModal'
import { DonutChart, type DonutChartDatum, ChartTooltip } from '@/components/charts'
import {
  despesasNoPeriodo,
  despesasPorCategoria,
  despesasPorCategoriaMes,
  despesasPorPessoaMes,
  periodRange,
  MESES_LABELS_CURTOS,
  type Periodo,
} from '@/lib/despesa-stats'

const PERIODOS: Array<{ key: Periodo; label: string }> = [
  { key: 'mes', label: 'Mês' },
  { key: 'trim', label: 'Trimestre' },
  { key: 'sem', label: 'Semestre' },
  { key: 'ano', label: 'Ano' },
]

const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmtDayHeader(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!y || !m || !d) return dateISO
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function toUnified(d: Despesa): UnifiedLancamento {
  const amount = Math.abs(Number(d.amount) || 0)
  return {
    id: d.id,
    kind: 'despesa',
    date: d.date,
    desc: d.desc ?? '',
    amount,
    amountSigned: -amount,
    person: d.person,
    category: d.category,
    sub: d.sub ?? null,
    contaId: d.contaId ?? null,
  }
}

export default function Despesas() {
  const { data, loading, error, load, syncStatus } = useData()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedLancamento | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  function openNew() {
    setEditing({
      id: '', kind: 'despesa', date: '', desc: '', amount: 0, amountSigned: 0,
    } as UnifiedLancamento)
    setModalOpen(true)
  }
  function openEdit(it: UnifiedLancamento) { setEditing(it); setModalOpen(true) }
  const editingForModal = editing && editing.id === '' ? null : editing
  const newKind = editing && editing.id === '' ? editing.kind : undefined

  const range = periodRange(periodo, year, month)

  // Despesas brutas do período (sem filtro de busca)
  const despesasPeriodo = useMemo<Despesa[]>(() => {
    if (!data) return []
    return despesasNoPeriodo(data, periodo, year, month)
  }, [data, periodo, year, month])

  // Lista filtrada pela busca (formato unificado pra reaproveitar modal)
  const items = useMemo<UnifiedLancamento[]>(() => {
    const xs = despesasPeriodo.map(toUnified)
    const sorted = xs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    if (!q.trim()) return sorted
    const needle = q.toLowerCase()
    return sorted.filter(
      (x) =>
        x.desc.toLowerCase().includes(needle) ||
        (x.person ?? '').toLowerCase().includes(needle) ||
        getCategoryLabel(x.category).toLowerCase().includes(needle),
    )
  }, [despesasPeriodo, q])

  const totalPeriodo = despesasPeriodo.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  // ── Donut: top 6 + "Outros" ─────────────────────────────
  const donutData = useMemo<DonutChartDatum[]>(() => {
    const all = despesasPorCategoria(despesasPeriodo)
    if (all.length === 0) return []
    const top = all.slice(0, 6)
    const rest = all.slice(6).reduce((s, x) => s + x.value, 0)
    const out: DonutChartDatum[] = top.map((c) => ({
      label: c.label,
      value: c.value,
      color: getCategoryColor(c.categoryKey),
    }))
    if (rest > 0) {
      out.push({ label: 'Outros', value: rest, color: '#64748b' })
    }
    return out
  }, [despesasPeriodo])

  // ── Linha "Por Pessoa — {período}" ──────────────────────
  // 1 linha por pessoa; eixo X = meses do período (range.start..range.end).
  const linhaPorPessoa = useMemo(() => {
    if (!data) return { series: [], chartData: [] as Array<Record<string, string | number>> }
    const ano = despesasPorPessoaMes(data, year).filter((p) => {
      // Só pessoas com despesa dentro do range
      for (let m = range.start; m <= range.end; m++) {
        if ((p.meses[m - 1] ?? 0) > 0) return true
      }
      return false
    })
    const labels: string[] = []
    for (let m = range.start; m <= range.end; m++) labels.push(MESES_LABELS_CURTOS[m - 1])
    const chartData = labels.map((label, idx) => {
      const mIdx = range.start - 1 + idx
      const row: Record<string, string | number> = { label }
      for (const p of ano) {
        row[p.pessoa] = p.meses[mIdx] ?? 0
      }
      return row
    })
    return {
      series: ano.map((p) => ({ pessoa: p.pessoa, color: personColor(p.pessoa) })),
      chartData,
    }
  }, [data, year, range.start, range.end])

  // ── Tabela "Por Categoria — {ANO}" ──────────────────────
  const tabelaCategoria = useMemo(() => {
    if (!data) return []
    return despesasPorCategoriaMes(data, year)
  }, [data, year])

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m); setYear(y)
  }
  function shiftYear(delta: number) {
    setYear((y) => y + delta)
  }

  // Header navegação muda conforme periodo
  const navLabel = (() => {
    if (periodo === 'ano') return `${year}`
    if (periodo === 'sem') return range.label
    if (periodo === 'trim') return range.label
    return `${MESES_FULL[month - 1]} ${year}`
  })()

  function shiftNav(delta: number) {
    if (periodo === 'ano') return shiftYear(delta)
    if (periodo === 'sem') {
      // semestre → ±6 meses
      let m = month + delta * 6
      let y = year
      while (m < 1) { m += 12; y -= 1 }
      while (m > 12) { m -= 12; y += 1 }
      setMonth(m); setYear(y); return
    }
    if (periodo === 'trim') {
      let m = month + delta * 3
      let y = year
      while (m < 1) { m += 12; y -= 1 }
      while (m > 12) { m -= 12; y += 1 }
      setMonth(m); setYear(y); return
    }
    shiftMonth(delta)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <TrendingDown size={22} className="text-red" />
            Despesas
          </h1>
          <p className="text-sm text-mist">
            Saídas do período. Escolha como agrupar para entender padrões.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
            {syncStatus === 'error' && <span className="ml-2 text-red">· erro de sync</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle de período */}
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className={
                  'rounded-full px-3 py-1 text-xs font-medium transition ' +
                  (periodo === p.key
                    ? 'bg-indigo text-white'
                    : 'text-mist hover:text-ink')
                }
                aria-pressed={periodo === p.key}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Nova despesa
          </Button>
        </div>
      </header>

      {/* Navegação do período */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex w-fit items-center gap-2 rounded-xl border border-line bg-surface px-1.5 py-1.5">
          <button
            type="button"
            onClick={() => shiftNav(-1)}
            className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
            aria-label="Período anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex min-w-[160px] items-center justify-center gap-1.5 text-center text-sm font-medium capitalize text-ink">
            <Calendar size={13} className="text-faint" />
            {navLabel}
          </div>
          <button
            type="button"
            onClick={() => shiftNav(1)}
            className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
            aria-label="Próximo período"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-mist">
            <span className="font-mono font-bold text-red">−{currencyBRL(totalPeriodo)}</span> total
          </span>
          <span className="text-faint">· {despesasPeriodo.length} {despesasPeriodo.length === 1 ? 'lançamento' : 'lançamentos'}</span>
        </div>
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {/* ── 2 charts lado a lado ─────────────────────── */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <PieIcon size={13} />
            Por categoria · {range.label}
          </div>
          <DonutChart
            data={donutData}
            totalLabel={currencyBRL(totalPeriodo)}
            totalHint="Total"
            height={240}
          />
        </div>
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <Users size={13} />
            Por pessoa · {range.label}
          </div>
          <PorPessoaChart
            data={linhaPorPessoa.chartData}
            series={linhaPorPessoa.series}
          />
        </div>
      </section>

      {/* ── Tabela Por Categoria — ANO ────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          Por categoria — {year}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="min-w-full text-xs">
            <thead className="border-b border-line bg-elevated/40 text-[11px] uppercase tracking-wide text-slate">
              <tr>
                <th className="sticky left-0 z-10 bg-elevated/40 px-3 py-2 text-left font-semibold">Categoria</th>
                {MESES_LABELS_CURTOS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-semibold">{m}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {tabelaCategoria.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-mist">
                    Sem despesas registradas em {year}.
                  </td>
                </tr>
              )}
              {tabelaCategoria.map((c) => (
                <tr key={c.categoryKey} className="border-b border-line/60 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-ink">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: getCategoryColor(c.categoryKey) }}
                      />
                      {c.categoria}
                    </span>
                  </td>
                  {c.meses.map((v, idx) => (
                    <td
                      key={idx}
                      className={
                        'px-2 py-2 text-right font-mono ' +
                        (v > 0 ? 'text-ink' : 'text-faint')
                      }
                    >
                      {v > 0 ? currencyBRL(v) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono font-bold text-ink">
                    {currencyBRL(c.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Busca + Lista ─────────────────────────────── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
            Lançamentos — {range.label}
          </h2>
          <div className="relative ml-auto min-w-[220px] flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descrição, pessoa, categoria…"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint outline-none focus:border-indigo"
            />
          </div>
        </div>

        {!loading && items.length === 0 && (data || !error) && (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm text-mist">Nenhuma despesa neste período.</p>
          </div>
        )}

        {items.length > 0 && (
          <ListaDespesas items={items} onEdit={openEdit} />
        )}
      </section>

      <LancamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingForModal}
        defaultKind={newKind}
      />
    </div>
  )
}

/** Lista agrupada por dia. */
function ListaDespesas({
  items,
  onEdit,
}: {
  items: UnifiedLancamento[]
  onEdit: (it: UnifiedLancamento) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, UnifiedLancamento[]>()
    for (const it of items) {
      const k = it.date || '—'
      const arr = map.get(k) ?? []
      arr.push(it)
      map.set(k, arr)
    }
    return [...map.entries()]
  }, [items])

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {groups.map(([dateKey, rows]) => (
        <div key={dateKey}>
          <div className="border-b border-line bg-elevated/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
            {fmtDayHeader(dateKey)}
          </div>
          {rows.map((it) => (
            <button
              type="button"
              key={it.id}
              onClick={() => onEdit(it)}
              className="flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left last:border-b-0 hover:bg-elevated/30 focus:bg-elevated/40 focus:outline-none"
            >
              <div
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: personColor(it.person) }}
                title={it.person ?? ''}
              >
                {personInitial(it.person)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{it.desc || '—'}</div>
                <div className="flex items-center gap-2 text-xs text-mist">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: getCategoryColor(it.category) }}
                  />
                  <span className="truncate">
                    {getCategoryLabel(it.category)}
                    {it.sub ? ` · ${it.sub}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 font-mono text-sm font-bold text-red">
                − {currencyBRL(it.amount)}
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Multi-linha por pessoa. Como o componente compartilhado `LineSeries` só
 * suporta uma série, fazemos inline aqui com Recharts puro respeitando
 * tokens visuais (border-line, bg-surface, currentColor).
 */
function PorPessoaChart({
  data,
  series,
}: {
  data: Array<Record<string, string | number>>
  series: Array<{ pessoa: string; color: string }>
}) {
  if (series.length === 0 || data.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-mist">
        <div className="grid place-items-center py-10 text-sm">Sem dados de despesa por pessoa.</div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-mist">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="label"
            stroke="currentColor"
            strokeOpacity={0.4}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            strokeOpacity={0.4}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
              if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
              return String(v)
            }}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={(props) => <ChartTooltip {...props} formatter={(v) => currencyBRL(v)} />}
          />
          {series.map((s) => (
            <Line
              key={s.pessoa}
              type="monotone"
              dataKey={s.pessoa}
              name={s.pessoa}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: s.color, stroke: 'transparent' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((s) => (
          <li key={s.pessoa} className="flex items-center gap-1.5 text-ink">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />
            <span className="truncate">{s.pessoa}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
