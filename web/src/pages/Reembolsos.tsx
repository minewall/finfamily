import { useEffect, useMemo, useState } from 'react'
import { Check, Receipt as ReceiptIcon, RotateCcw, Users } from 'lucide-react'
import {
  currencyBRL,
  getReembolsos,
  reembolsosPendentesPorDevedor,
  totalReembolsoPendente,
  personColor,
  personInitial,
  type Despesa,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { LancamentoModal } from '@/components/LancamentoModal'

function fmtBRDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export default function Reembolsos() {
  const { data, loading, error, load, marcarReembolsoPago, marcarReembolsoPendente } = useData()
  const [tab, setTab] = useState<'pendente' | 'pago' | 'todos'>('pendente')
  const [editing, setEditing] = useState<Despesa | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const filtrados = useMemo(() => {
    if (!data) return []
    return getReembolsos(data, tab).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [data, tab])

  const totalPendente = data ? totalReembolsoPendente(data) : 0
  const porDevedor = data ? reembolsosPendentesPorDevedor(data) : {}

  if (loading && !data) {
    return <div className="mx-auto max-w-4xl px-5 py-8 text-mist">Carregando…</div>
  }
  if (error && !data) {
    return <div className="mx-auto max-w-4xl px-5 py-8 text-red">Erro: {error}</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-amber">
          <ReceiptIcon size={14} /> Reembolsos
        </div>
        <h1 className="mt-1 text-2xl font-bold text-ink">Quem devolve quanto</h1>
        <p className="text-sm text-mist">
          Despesas marcadas com "aguardando reembolso" no modal de edição aparecem aqui. Clique pra editar ou marcar como pago.
        </p>
      </header>

      {/* Resumo coletivo */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-gradient-to-br from-amber/15 to-amber/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber">Total pendente</div>
          <div className="mt-1 font-mono text-xl font-extrabold text-ink">{currencyBRL(totalPendente)}</div>
          <div className="mt-1 text-[11px] text-faint">
            {Object.keys(porDevedor).length === 0
              ? 'Nada em aberto'
              : `${Object.keys(porDevedor).length} pessoa(s) devem devolver`}
          </div>
        </div>
        {Object.entries(porDevedor).slice(0, 2).map(([de, info]) => (
          <div key={de} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
              <div
                className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: personColor(de) }}
              >
                {personInitial(de)}
              </div>
              {de} deve
            </div>
            <div className="mt-1 font-mono text-xl font-extrabold text-ink">{currencyBRL(info.total)}</div>
            <div className="mt-1 text-[11px] text-faint">{info.items.length} despesa(s)</div>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-line-2 bg-elevated p-0.5">
        {(['pendente', 'pago', 'todos'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              'rounded-md px-4 py-1.5 text-xs font-bold capitalize transition-colors ' +
              (tab === t ? 'bg-indigo/15 text-indigo' : 'text-mist hover:text-ink')
            }
          >
            {t === 'pendente' ? 'Pendentes' : t === 'pago' ? 'Pagos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <Users size={28} className="mx-auto mb-3 text-faint" />
          <div className="font-medium text-ink">
            {tab === 'pendente' ? 'Nenhum reembolso pendente' : tab === 'pago' ? 'Nenhum reembolso já pago' : 'Nenhum reembolso registrado'}
          </div>
          <p className="mt-1 text-sm text-mist">
            Pra marcar uma despesa como aguardando reembolso, abra ela em /despesas e ative "Aguardando reembolso".
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((d) => {
            const r = d.reembolso!
            const isPago = r.status === 'pago'
            const valor = Number(r.valor ?? d.amount ?? 0)
            return (
              <article
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-indigo/50"
              >
                <button
                  type="button"
                  onClick={() => setEditing(d)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div
                    className={
                      'grid h-9 w-9 place-items-center rounded-xl ' +
                      (isPago ? 'bg-green/15 text-green' : 'bg-amber/15 text-amber')
                    }
                  >
                    {isPago ? <Check size={16} /> : <ReceiptIcon size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">{d.desc}</span>
                      <span className="text-[11px] text-faint">{fmtBRDate(d.date)}</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-mist">
                      <span className="font-medium text-ink">{r.para}</span>
                      <span className="text-faint"> pagou — </span>
                      <span className="font-medium text-ink">{r.de}</span>
                      <span className="text-faint"> deve devolver</span>
                      {isPago && r.paidAt && (
                        <span className="text-faint"> · pago em {fmtBRDate(r.paidAt)}</span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={'font-mono text-sm font-extrabold ' + (isPago ? 'text-green' : 'text-amber')}>
                      {currencyBRL(valor)}
                    </div>
                    {valor < Number(d.amount ?? 0) - 0.01 && (
                      <div className="text-[10px] text-faint">de {currencyBRL(Number(d.amount))}</div>
                    )}
                  </div>
                  {isPago ? (
                    <Button variant="ghost" size="sm" onClick={() => marcarReembolsoPendente(d.id)}>
                      <RotateCcw size={12} /> Reabrir
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => marcarReembolsoPago(d.id)}>
                      <Check size={12} /> Recebi
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <LancamentoModal
          open
          onClose={() => setEditing(null)}
          editing={{ ...editing, kind: 'despesa' } as unknown as Parameters<typeof LancamentoModal>[0]['editing']}
        />
      )}
    </div>
  )
}
