import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  currencyBRL,
  getTributos,
  getTributosByTipo,
  getTributosVencendoEm,
  totalTributosAno,
  type Tributo,
  type TributoTipo,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { TributoModal } from '@/components/TributoModal'

type Tab = 'irpf' | 'iptu' | 'ipva' | 'outros'

const TAB_LABEL: Record<Tab, string> = {
  irpf: 'IRPF',
  iptu: 'IPTU',
  ipva: 'IPVA',
  outros: 'Outros',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y.slice(2)}`
}

export default function Tributario() {
  const data = useData((s) => s.data)
  const loading = useData((s) => s.loading)
  const load = useData((s) => s.load)
  const syncStatus = useData((s) => s.syncStatus)

  const anoAtual = new Date().getFullYear()
  const [tab, setTab] = useState<Tab>('irpf')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tributo | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const tributos = useMemo(() => (data ? getTributos(data) : []), [data])
  const tributosAno = useMemo(
    () => tributos.filter((t) => (t.ano ?? anoAtual) === anoAtual),
    [tributos, anoAtual],
  )

  const irpfs = useMemo(() => (data ? getTributosByTipo(data, 'irpf').filter((t) => t.ano === anoAtual) : []), [data, anoAtual])
  const iptus = useMemo(() => (data ? getTributosByTipo(data, 'iptu').filter((t) => t.ano === anoAtual) : []), [data, anoAtual])
  const ipvas = useMemo(() => (data ? getTributosByTipo(data, 'ipva').filter((t) => t.ano === anoAtual) : []), [data, anoAtual])
  const outros = useMemo(() => (data ? getTributosByTipo(data, 'outros').filter((t) => t.ano === anoAtual) : []), [data, anoAtual])

  const totalAno = useMemo(() => (data ? totalTributosAno(data, anoAtual) : 0), [data, anoAtual])
  const proximos = useMemo(
    () => (data ? getTributosVencendoEm(data, undefined, 60) : []),
    [data],
  )

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(t: Tributo) { setEditing(t); setModalOpen(true) }

  const listaTab: Tributo[] = tab === 'irpf' ? irpfs : tab === 'iptu' ? iptus : tab === 'ipva' ? ipvas : outros

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Tributário <span className="text-mist">— {anoAtual}</span>
          </h1>
          <p className="text-sm text-mist">
            IRPF, IPTU, IPVA e calendário fiscal.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Novo tributo
        </Button>
      </header>

      {/* KPIs */}
      {tributosAno.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Total do ano"
            value={`${totalAno < 0 ? '-' : ''}${currencyBRL(Math.abs(totalAno))}`}
            sub={totalAno >= 0 ? 'a pagar' : 'a receber líquido'}
            tone={totalAno >= 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="IRPF"
            value={
              irpfs[0]
                ? irpfs[0].aReceber
                  ? '+' + currencyBRL(irpfs[0].aReceber)
                  : irpfs[0].aPagar
                    ? '-' + currencyBRL(irpfs[0].aPagar)
                    : '—'
                : '—'
            }
            sub={
              irpfs[0]
                ? irpfs[0].aReceber
                  ? 'restituição prevista'
                  : irpfs[0].aPagar
                    ? `parcelado ${irpfs[0].pagas || 0}/${irpfs[0].totalParcelas || irpfs[0].parcelas || 1}`
                    : 'declaração entregue'
                : 'não declarado'
            }
            tone={irpfs[0]?.aReceber ? 'green' : 'amber'}
          />
          <KpiCard
            label="IPTU"
            value={currencyBRL(iptus.reduce((s, t) => s + (t.valor || 0), 0))}
            sub={`${iptus.length} imóvel${iptus.length !== 1 ? 's' : ''}`}
            tone="amber"
          />
          <KpiCard
            label="IPVA"
            value={currencyBRL(ipvas.reduce((s, t) => s + (t.valor || 0), 0))}
            sub={`${ipvas.length} veículo${ipvas.length !== 1 ? 's' : ''}`}
            tone="indigo"
          />
        </div>
      )}

      {/* Próximos vencimentos */}
      {proximos.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
          <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Calendar size={14} className="text-amber" />
            Próximos vencimentos (60 dias)
          </header>
          <ul className="divide-y divide-line">
            {proximos.slice(0, 8).map((p, idx) => (
              <li key={`${p.tributo.id}-${idx}`} className="flex flex-wrap items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => openEdit(p.tributo)}
                  className="flex-1 text-left text-sm font-medium text-ink hover:text-indigo"
                >
                  {p.tributo.label}
                  <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-wide text-faint">
                    {p.tributo.tipo}
                  </span>
                </button>
                <span className="text-xs text-mist">{formatDate(p.date)}</span>
                <span className="text-[11px] text-mist">
                  {p.parcelaNum}/{p.tributo.parcelas || 1}
                </span>
                <span className="font-mono text-sm font-bold text-ink">{currencyBRL(p.valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs por tipo */}
      <div className="mb-5 inline-flex flex-wrap rounded-xl border border-line bg-surface p-1">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          const count = t === 'irpf' ? irpfs.length : t === 'iptu' ? iptus.length : t === 'ipva' ? ipvas.length : outros.length
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
              {TAB_LABEL[t]}
              <span className="text-faint">({count})</span>
            </button>
          )
        })}
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}

      {/* Empty state */}
      {listaTab.length === 0 && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <FileSpreadsheet className="mx-auto mb-3 text-faint" size={28} />
          <p className="text-sm text-mist">
            {tributosAno.length === 0
              ? `Nenhum tributo cadastrado para ${anoAtual}.`
              : `Nenhum ${TAB_LABEL[tab]} cadastrado em ${anoAtual}.`}
          </p>
          <Button onClick={openNew} className="mt-4" size="sm">
            <Plus size={14} /> Cadastrar tributo
          </Button>
        </div>
      )}

      {/* Cards do tipo selecionado */}
      {listaTab.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listaTab.map((t) => {
            const total = t.parcelas || 1
            const pagas = t.pagas || 0
            const pct = total > 0 ? pagas / total : 0
            const quitado = pagas >= total
            const valorRelevante =
              t.tipo === 'irpf' ? (t.aReceber || t.aPagar || t.valor) : (t.valor || 0)
            const corBorda =
              t.tipo === 'irpf'
                ? t.aReceber
                  ? 'var(--color-green)'
                  : 'var(--color-amber)'
                : t.tipo === 'iptu'
                  ? 'var(--color-amber)'
                  : t.tipo === 'ipva'
                    ? 'var(--color-indigo)'
                    : 'var(--color-slate)'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openEdit(t)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                style={{ borderTop: `3px solid ${corBorda}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: corBorda }}
                  >
                    {t.tipo}
                  </span>
                  {quitado && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-green">
                      <CheckCircle2 size={11} /> quitado
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-[15px] font-bold text-ink line-clamp-2">{t.label}</h3>
                {t.pessoa && (
                  <p className="text-[11px] text-mist">{t.pessoa}</p>
                )}
                {t.tipo === 'ipva' && t.placa && (
                  <p className="font-mono text-[10.5px] text-faint">{t.placa}</p>
                )}

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-ink">
                    {currencyBRL(valorRelevante)}
                  </span>
                  {t.tipo === 'irpf' && t.aReceber ? (
                    <span className="text-[11px] text-green">a receber</span>
                  ) : t.tipo === 'irpf' && t.aPagar ? (
                    <span className="text-[11px] text-red">a pagar</span>
                  ) : (
                    <span className="text-[11px] text-mist">no ano</span>
                  )}
                </div>

                {/* Barra de parcelas */}
                <div className="mt-3">
                  <div className="mb-1 flex items-baseline justify-between text-[11px]">
                    <span className="text-faint">
                      {pagas}/{total} parcela{total !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono text-faint">
                      {Math.round(pct * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(pct * 100))}%`,
                        background: corBorda,
                      }}
                    />
                  </div>
                </div>

                {/* Vencimento */}
                <div className="mt-3 flex items-center gap-1 text-[11px] text-mist">
                  <Calendar size={11} />
                  Vence dia {t.vencimentoDia || 10}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <TributoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultTipo={tab as TributoTipo}
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
  const TONES: Record<KpiProps['tone'], string> = {
    green:  'var(--color-green)',
    red:    'var(--color-red)',
    indigo: 'var(--color-indigo)',
    amber:  'var(--color-amber)',
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">{label}</span>
        <AlertCircle size={14} style={{ color: TONES[tone] }} />
      </div>
      <div className="mt-2 font-mono text-xl font-bold" style={{ color: TONES[tone] }}>{value}</div>
      <div className="mt-1 text-[11px] text-mist">{sub}</div>
    </div>
  )
}
