import { useEffect, useState } from 'react'
import { Plus, Landmark } from 'lucide-react'
import {
  type Financiamento,
  currencyBRL,
  totalFinanciamentosDevedor,
  getFinanciamentoResumo,
  FINANCIAMENTO_TIPOS,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { FinanciamentoModal } from '@/components/FinanciamentoModal'
import { FinanciamentoDetalhesModal } from '@/components/FinanciamentoDetalhesModal'

export default function Financiamentos() {
  const { data, loading, error, load, syncStatus } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Financiamento | null>(null)
  const [detalhes, setDetalhes] = useState<Financiamento | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const fins = ((data?.financiamentos as Financiamento[] | undefined) ?? [])
  const totalDevedor = data ? totalFinanciamentosDevedor(data) : 0
  const proximaParcelaTotal = fins.reduce((s, f) => s + getFinanciamentoResumo(f).parcelaProxima, 0)
  const totalContratado = fins.reduce((s, f) => s + (f.valorFinanciado || 0), 0)

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
            Imóveis, veículos e outros. Saldo devedor, juros e simulação de antecipação (SAC/Price).
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

      {/* Hero KPI — Saldo devedor total */}
      {fins.length > 0 && (
        <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-red/15 text-red">
              <Landmark size={18} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                Saldo devedor total
              </div>
              <div className="text-[11px] text-mist">
                {fins.length} financiamento{fins.length === 1 ? '' : 's'} ativo{fins.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          <div className="mt-3 font-mono text-3xl font-extrabold text-red">
            {currencyBRL(totalDevedor)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-mist sm:grid-cols-3">
            <div>
              <span className="text-faint">Próxima parcela mensal</span>
              <div className="font-mono font-bold text-ink">{currencyBRL(proximaParcelaTotal)}</div>
            </div>
            <div>
              <span className="text-faint">Total contratado</span>
              <div className="font-mono font-bold text-ink">{currencyBRL(totalContratado)}</div>
            </div>
          </div>
        </div>
      )}

      {fins.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">Nenhum financiamento cadastrado ainda.</p>
          <Button onClick={openNew} className="mt-4" size="sm">
            <Plus size={14} /> Adicionar primeiro financiamento
          </Button>
        </div>
      )}

      {fins.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fins.map((f) => {
            const r = getFinanciamentoResumo(f)
            const tipoInfo = FINANCIAMENTO_TIPOS.find((t) => t.id === f.tipo)
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

                {/* Barra de % pago */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10.5px] text-faint">
                    <span>{r.pagas}/{f.prazo} pagas</span>
                    <span>{r.pctPago.toFixed(0)}% quitado</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full bg-green"
                      style={{ width: `${Math.min(100, Math.max(0, r.pctPago))}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
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
