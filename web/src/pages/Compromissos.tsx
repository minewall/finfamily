import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCcw,
  AlertCircle,
  Repeat,
} from 'lucide-react'
import {
  currencyBRL,
  getCompromissos,
  getContratoPerformance,
  getProximasParcelas,
  PERIODICIDADES,
  COMPROMISSO_TIPOS,
  type Contrato,
  type NaturezaCompromisso,
  type ParcelaStatus,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { ContratoModal } from '@/components/ContratoModal'

type Tab = 'todos' | NaturezaCompromisso

const TAB_LABEL: Record<Tab, string> = {
  todos: 'Todos',
  recorrente: 'Recorrentes',
  divida: 'Dívidas',
}

function periodicidadeLabel(id: string): string {
  return PERIODICIDADES.find((p) => p.id === id)?.label ?? id
}

function tipoLabel(id?: string): string {
  if (!id) return ''
  return COMPROMISSO_TIPOS.find((t) => t.id === id)?.label ?? id
}

function statusBadge(status: ParcelaStatus) {
  switch (status) {
    case 'pago':
      return { label: 'pago', cls: 'text-green', Icon: CheckCircle2 }
    case 'atrasada':
      return { label: 'atrasada', cls: 'text-red', Icon: AlertTriangle }
    default:
      return { label: 'pendente', cls: 'text-amber', Icon: Clock }
  }
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y.slice(2)}`
}

export default function Compromissos() {
  const data = useData((s) => s.data)
  const loading = useData((s) => s.loading)
  const error = useData((s) => s.error)
  const load = useData((s) => s.load)
  const syncStatus = useData((s) => s.syncStatus)
  const marcarParcelaPaga = useData((s) => s.marcarParcelaPaga)

  const [tab, setTab] = useState<Tab>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contrato | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const contratos = useMemo(() => (data ? getCompromissos(data) : []), [data])
  const filtrados = useMemo(
    () => (tab === 'todos' ? contratos : contratos.filter((c) => (c.natureza || 'recorrente') === tab)),
    [contratos, tab],
  )

  const nRec = contratos.filter((c) => (c.natureza || 'recorrente') === 'recorrente').length
  const nDiv = contratos.filter((c) => c.natureza === 'divida').length

  const proximas = useMemo(() => (data ? getProximasParcelas(data, 30) : []), [data])

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Contrato) { setEditing(c); setModalOpen(true) }

  // KPI agregados
  const ativos = contratos.filter((c) => c.active !== false)
  const atrasadasTotal = ativos.reduce((s, c) => {
    return s + ((c.parcelas ?? []).filter((p) => p.status === 'atrasada').length)
  }, 0)
  const impactoMensal = ativos
    .filter((c) => (c.natureza || 'recorrente') === 'recorrente')
    .reduce((s, c) => s + (c.valorParcela || 0), 0)

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Compromissos</h1>
          <p className="text-sm text-mist">
            Recorrentes (assinaturas, aluguel, planos) e dívidas parceladas.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Novo
        </Button>
      </header>

      {/* Tabs natureza */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          const count = t === 'todos' ? contratos.length : t === 'recorrente' ? nRec : nDiv
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ' +
                (active ? 'bg-elevated text-ink' : 'text-mist hover:text-ink')
              }
            >
              {t === 'recorrente' && <Repeat size={12} />}
              {t === 'divida' && <AlertCircle size={12} />}
              {TAB_LABEL[t]}
              <span className="text-faint">({count})</span>
            </button>
          )
        })}
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {/* KPIs */}
      {contratos.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Ativos"
            value={`${ativos.length}`}
            sub={`${atrasadasTotal} parcela${atrasadasTotal !== 1 ? 's' : ''} atrasada${atrasadasTotal !== 1 ? 's' : ''}`}
            tone={atrasadasTotal > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="Recorrentes (mensal)"
            value={currencyBRL(impactoMensal)}
            sub={`${nRec} compromisso${nRec !== 1 ? 's' : ''}`}
            tone="indigo"
          />
          <KpiCard
            label="Próximas 30 dias"
            value={`${proximas.length}`}
            sub={`${currencyBRL(proximas.reduce((s, p) => s + p.valor, 0))} no total`}
            tone="amber"
          />
        </div>
      )}

      {/* Próximas parcelas */}
      {proximas.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock size={14} className="text-amber" />
            Próximas parcelas (30 dias)
          </header>
          <ul className="divide-y divide-line">
            {proximas.slice(0, 8).map((p) => {
              const b = statusBadge(p.parcela.status)
              return (
                <li key={`${p.contrato.id}-${p.ano}-${p.mes}`} className="flex flex-wrap items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p.contrato)}
                    className="flex-1 text-left text-sm font-medium text-ink hover:text-indigo"
                  >
                    {p.contrato.label}
                  </button>
                  <span className="text-xs text-mist">{formatDate(p.date)}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${b.cls}`}>
                    <b.Icon size={11} /> {b.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-ink">{currencyBRL(p.valor)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => marcarParcelaPaga(p.contrato.id, p.mes, p.ano)}
                  >
                    <CheckCircle2 size={12} /> Pago
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {filtrados.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <FileText className="mx-auto mb-3 text-faint" size={28} />
          <p className="text-sm text-mist">
            {contratos.length === 0
              ? 'Nenhum compromisso cadastrado ainda.'
              : `Nenhum compromisso em ${TAB_LABEL[tab].toLowerCase()}.`}
          </p>
          {contratos.length === 0 && (
            <Button onClick={openNew} className="mt-4" size="sm">
              <Plus size={14} /> Adicionar primeiro compromisso
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {filtrados.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => {
            const perf = getContratoPerformance(c)
            const cor = c.natureza === 'divida' ? 'var(--color-red)' : 'var(--color-green)'
            const proxima = perf.proxima
            const proxBadge = proxima ? statusBadge(proxima.status) : null
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openEdit(c)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                style={{ borderTop: `3px solid ${cor}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: cor }}
                  >
                    {c.natureza === 'divida' ? 'Dívida' : tipoLabel(c.tipoCompromisso) || 'Recorrente'}
                  </span>
                  {perf.atrasadas > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-red">
                      <AlertTriangle size={11} /> {perf.atrasadas}
                    </span>
                  )}
                  {perf.parcelasRestantes === 0 && perf.totalParcelas > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-green">
                      <CheckCircle2 size={11} /> quitado
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-[15px] font-bold text-ink line-clamp-2">{c.label}</h3>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-ink">
                    {currencyBRL(c.valorParcela)}
                  </span>
                  <span className="text-[11px] text-mist">
                    · {periodicidadeLabel(c.periodicidade)}
                  </span>
                </div>

                {/* Barra de performance */}
                <div className="mt-3">
                  <div className="mb-1 flex items-baseline justify-between text-[11px]">
                    <span className="text-faint">
                      {perf.pagas}/{perf.totalParcelas} pagas
                    </span>
                    <span className="font-mono text-faint">
                      {currencyBRL(perf.totalPago)} / {currencyBRL(perf.totalPrevisto)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(perf.pctParcelas * 100))}%`,
                        background: cor,
                      }}
                    />
                  </div>
                </div>

                {/* Próxima parcela */}
                {proxima && proxBadge && (
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-mist">
                      Próxima: <span className="text-ink">{formatDate(proxima.date)}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${proxBadge.cls}`}>
                      <proxBadge.Icon size={11} /> {proxBadge.label}
                    </span>
                  </div>
                )}
                {!proxima && perf.totalParcelas > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-green">
                    <CheckCircle2 size={11} /> Sem parcelas em aberto
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <ContratoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultNatureza={tab === 'divida' ? 'divida' : tab === 'recorrente' ? 'recorrente' : undefined}
      />
    </div>
  )
}

interface KpiProps {
  label: string
  value: string
  sub: string
  tone: 'green' | 'red' | 'indigo' | 'amber'
}

function KpiCard({ label, value, sub, tone }: KpiProps) {
  const TONES: Record<KpiProps['tone'], { color: string; Icon: typeof RefreshCcw }> = {
    green:  { color: 'var(--color-green)', Icon: CheckCircle2 },
    red:    { color: 'var(--color-red)', Icon: AlertTriangle },
    indigo: { color: 'var(--color-indigo)', Icon: Repeat },
    amber:  { color: 'var(--color-amber)', Icon: Clock },
  }
  const t = TONES[tone]
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">{label}</span>
        <t.Icon size={14} style={{ color: t.color }} />
      </div>
      <div className="mt-2 font-mono text-xl font-bold" style={{ color: t.color }}>{value}</div>
      <div className="mt-1 text-[11px] text-mist">{sub}</div>
    </div>
  )
}
