import { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Receipt,
  TrendingDown,
  Percent,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type Financiamento,
  currencyBRL,
  getFinanciamentoResumo,
  FINANCIAMENTO_TIPOS,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { FinanciamentoModal } from '@/components/FinanciamentoModal'
import { FinanciamentoDetalhesModal } from '@/components/FinanciamentoDetalhesModal'
import {
  LineSeries,
  type LineSeriesDatum,
  ChartTooltip,
  type TooltipPayloadItem,
} from '@/components/charts'
import {
  financiamentoKpis,
  evolucaoSaldoDevedor,
  amortizacaoVsJuros,
  statusFinanciamento,
} from '@/lib/financiamento-stats'

const MES_LABEL_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export default function Financiamentos() {
  const { data, loading, error, load, syncStatus } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Financiamento | null>(null)
  const [detalhes, setDetalhes] = useState<Financiamento | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const fins = ((data?.financiamentos as Financiamento[] | undefined) ?? [])
  const now = new Date()
  const year = now.getFullYear()
  const month0 = now.getMonth()

  const kpis = useMemo(() => financiamentoKpis(data), [data])
  const evolucao: LineSeriesDatum[] = useMemo(
    () => evolucaoSaldoDevedor(data, year).map((p) => ({ label: p.periodo, value: p.valor })),
    [data, year],
  )
  const amortRows = useMemo(
    () => amortizacaoVsJuros(data, month0, year),
    [data, month0, year],
  )

  const ativosCount = fins.filter((f) => {
    const r = getFinanciamentoResumo(f)
    return r.restantes > 0
  }).length

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(f: Financiamento) {
    setDetalhes(null)
    setEditing(f); setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Financiamentos</h1>
          <p className="text-sm text-mist">
            Acompanhe juntos saldo devedor, juros e a evolução dos seus contratos (SAC/Price).
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Novo
        </Button>
      </header>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {fins.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo/15 text-indigo">
            <Receipt size={20} />
          </div>
          <h2 className="text-base font-bold text-ink">Sem financiamentos por enquanto</h2>
          <p className="mt-1 text-sm text-mist">
            Cadastre seu primeiro financiamento pra acompanhar amortização e juros.
          </p>
          <Button onClick={openNew} className="mt-5" size="sm">
            <Plus size={14} /> Cadastrar financiamento
          </Button>
        </div>
      )}

      {fins.length > 0 && (
        <>
          {/* Resumo — 4 KPIs */}
          <section className="mb-6">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate">
              Resumo dos seus financiamentos
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi
                label="Saldo devedor"
                value={currencyBRL(kpis.saldoDevedor)}
                tone="text-red"
                icon={<TrendingDown size={14} />}
                hint={`${ativosCount} ativo${ativosCount === 1 ? '' : 's'}`}
              />
              <Kpi
                label="Parcela mensal"
                value={currencyBRL(kpis.parcelaMensal)}
                tone="text-ink"
                icon={<Receipt size={14} />}
                hint="Próxima parcela total"
              />
              <Kpi
                label="Valor pago"
                value={currencyBRL(kpis.valorPago)}
                tone="text-green"
                icon={<BarChart2 size={14} />}
                hint="Acumulado até hoje"
              />
              <Kpi
                label="Média de juros"
                value={`${kpis.mediaJuros.toFixed(2)}% a.m.`}
                tone="text-amber-500"
                icon={<Percent size={14} />}
                hint="Ponderada pelo saldo"
              />
            </div>
          </section>

          {/* Charts */}
          {ativosCount > 0 && (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <LineSeries
                data={evolucao}
                height={240}
                title={`Evolução do saldo devedor — ${year}`}
                color="#ff4a68"
              />
              <AmortizacaoVsJurosChart
                data={amortRows}
                title={`Amortização vs juros — ${MES_LABEL_LONG[month0]}`}
              />
            </section>
          )}

          {/* Lista de financiamentos */}
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate">
              Seus contratos
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fins.map((f) => {
                const r = getFinanciamentoResumo(f)
                const tipoInfo = FINANCIAMENTO_TIPOS.find((t) => t.id === f.tipo)
                const status = statusFinanciamento(f)
                const pct = f.prazo > 0 ? (r.pagas / f.prazo) * 100 : 0
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDetalhes(f)}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                          {tipoInfo?.label ?? 'Financiamento'} · {f.sistema.toUpperCase()}
                        </div>
                        <div className="truncate text-[15px] font-bold text-ink">{f.label}</div>
                        {f.banco && (
                          <div className="text-[11px] text-faint">{f.banco}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10.5px] uppercase tracking-wide text-slate">Saldo</div>
                        <div className="font-mono text-base font-extrabold text-red">
                          {currencyBRL(r.saldoAtual)}
                        </div>
                      </div>
                    </div>

                    {status && (
                      <div className="mt-2">
                        <StatusBadge status={status} />
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] text-mist">
                      <div>
                        <span className="text-faint">Parcela atual</span>
                        <div className="font-mono font-bold text-ink">{currencyBRL(r.parcelaAtual || r.parcelaInicial)}</div>
                      </div>
                      <div>
                        <span className="text-faint">Próxima</span>
                        <div className="font-mono font-bold text-ink">{currencyBRL(r.parcelaProxima)}</div>
                      </div>
                    </div>

                    {/* Progress bar — parcelas pagas / total */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10.5px] text-faint">
                        <span>{r.pagas}/{f.prazo} parcelas</span>
                        <span>{pct.toFixed(0)}% pago</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full bg-green transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      <FinanciamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
      <FinanciamentoDetalhesModal
        open={!!detalhes}
        onClose={() => setDetalhes(null)}
        financiamento={detalhes}
        onEdit={openEdit}
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string
  value: string
  tone: string
  icon: React.ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-extrabold ${tone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-faint">{hint}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: 'em-dia' | 'atrasado' }) {
  if (status === 'em-dia') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[10.5px] font-semibold text-green">
        <CheckCircle2 size={11} /> Em dia
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-500">
      <AlertTriangle size={11} /> Atrasado
    </span>
  )
}

interface AmortRow {
  label: string
  amortizacao: number
  juros: number
}

function AmortizacaoVsJurosChart({ data, title }: { data: AmortRow[]; title: string }) {
  const COLORS = { amortizacao: '#1dc97e', juros: '#f59e0b' }
  const filtered = data.filter((r) => r.amortizacao > 0 || r.juros > 0)
  const chartData = filtered.map((r) => ({
    label: truncate(r.label, 14),
    Amortização: r.amortizacao,
    Juros: r.juros,
  }))

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-mist">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
        {title}
      </h3>
      {chartData.length === 0 ? (
        <div className="grid h-[240px] place-items-center text-[12px] text-faint">
          Sem parcelas neste mês.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              tickFormatter={(v: number) => formatCompact(v)}
              width={56}
            />
            <Tooltip
              cursor={{ fill: 'currentColor', fillOpacity: 0.06 }}
              content={(props) => {
                const payload = (props.payload ?? []) as ReadonlyArray<TooltipPayloadItem>
                return (
                  <ChartTooltip
                    active={props.active}
                    label={props.label}
                    payload={payload}
                    formatter={(v) => currencyBRL(v)}
                  />
                )
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-[11px] text-mist">{value}</span>
              )}
            />
            <Bar
              dataKey="Amortização"
              stackId="parcela"
              fill={COLORS.amortizacao}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Juros"
              stackId="parcela"
              fill={COLORS.juros}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
