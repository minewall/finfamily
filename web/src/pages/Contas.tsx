import { useEffect, useMemo, useState } from 'react'
import { Plus, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { currencyBRL, getContaResumo, type Conta } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { ContaModal } from '@/components/ContaModal'
import { ContaDrilldownModal } from '@/components/ContaDrilldownModal'

const DEFAULT_COR = '#6b5ef5'

function formatRelative(dateISO: string | undefined): string {
  if (!dateISO) return '—'
  const d = new Date(dateISO)
  if (isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (Math.abs(diffDays) >= 30) return rtf.format(-Math.round(diffDays / 30), 'month')
  if (Math.abs(diffDays) >= 7) return rtf.format(-Math.round(diffDays / 7), 'week')
  return rtf.format(-diffDays, 'day')
}

export default function Contas() {
  const { data, loading, error, load, syncStatus } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Conta | null>(null)
  const [drilldown, setDrilldown] = useState<Conta | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const contas = (data?.contas ?? []) as Conta[]

  const resumos = useMemo(() => {
    if (!data) return new Map<string, ReturnType<typeof getContaResumo>>()
    const m = new Map<string, ReturnType<typeof getContaResumo>>()
    for (const c of contas) {
      m.set(c.id, getContaResumo(data, c.id, { month, year, limite: 1 }))
    }
    return m
  }, [data, contas, month, year])

  const totalSaldo = contas.reduce((s, c) => s + (Number(c.saldo) || 0), 0)
  const totalEntradas = Array.from(resumos.values()).reduce((s, r) => s + r.entradasMes, 0)
  const totalSaidas = Array.from(resumos.values()).reduce((s, r) => s + r.saidasMes, 0)
  const variacao = totalEntradas - totalSaidas

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Conta) {
    setDrilldown(null)
    setEditing(c); setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Contas</h1>
          <p className="text-sm text-mist">
            Suas contas, lado a lado.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Nova conta
        </Button>
      </header>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {contas.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
                <Wallet size={14} /> Saldo consolidado
              </div>
              <div className="font-mono text-3xl font-extrabold text-ink">
                {currencyBRL(totalSaldo)}
              </div>
              <div className="mt-1 text-sm text-mist">
                {contas.length} {contas.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-3 gap-4 sm:max-w-md">
              <div className="rounded-xl border border-line bg-elevated/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
                  <TrendingUp size={12} /> Entradas
                </div>
                <div className="font-mono text-sm font-bold text-green">
                  +{currencyBRL(totalEntradas)}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-elevated/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
                  <TrendingDown size={12} /> Saídas
                </div>
                <div className="font-mono text-sm font-bold text-red">
                  −{currencyBRL(totalSaidas)}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-elevated/30 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
                  Variação
                </div>
                <div className={
                  'font-mono text-sm font-bold ' +
                  (variacao >= 0 ? 'text-green' : 'text-red')
                }>
                  {variacao >= 0 ? '+' : '−'}{currencyBRL(Math.abs(variacao))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {contas.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated text-slate">
            <Wallet size={22} />
          </div>
          <h2 className="text-base font-bold text-ink">Comece pelo saldo</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-mist">
            Adicione sua primeira conta pra ter um saldo consolidado preciso e enxergar
            entradas e saídas do mês em um só lugar.
          </p>
          <Button onClick={openNew} className="mt-5" size="sm">
            <Plus size={14} /> Adicionar primeira conta
          </Button>
        </div>
      )}

      {contas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contas.map((c) => {
            const cor = c.cor ?? DEFAULT_COR
            const resumo = resumos.get(c.id)
            const entradas = resumo?.entradasMes ?? 0
            const saidas = resumo?.saidasMes ?? 0
            const ultima = resumo?.recentes?.[0]
            const ultimaLabel = ultima ? formatRelative(ultima.date) : '—'
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setDrilldown(c)}
                className="group cursor-pointer rounded-2xl border border-line border-l-[3px] bg-surface p-5 text-left transition-colors hover:bg-elevated/40"
                style={{ borderLeftColor: cor }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-ink">{c.nome}</div>
                    <div className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-slate">
                      {c.banco || 'Banco'}{c.tipo ? ' · ' + c.tipo : ''}
                    </div>
                  </div>
                  <span
                    className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: cor }}
                    aria-hidden
                  />
                </div>

                <div className="mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate">Saldo</div>
                  <div className="font-mono text-2xl font-extrabold" style={{ color: cor }}>
                    {currencyBRL(c.saldo)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
                  <div>
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
                      <TrendingUp size={11} /> Entradas
                    </div>
                    <div className="font-mono text-xs font-bold text-green">
                      +{currencyBRL(entradas)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate">
                      <TrendingDown size={11} /> Saídas
                    </div>
                    <div className="font-mono text-xs font-bold text-red">
                      −{currencyBRL(saidas)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-faint">
                  Última movimentação: <span className="text-mist">{ultimaLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <ContaModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <ContaDrilldownModal
        open={!!drilldown}
        onClose={() => setDrilldown(null)}
        conta={drilldown}
        onEdit={openEdit}
        month={month}
        year={year}
      />
    </div>
  )
}
