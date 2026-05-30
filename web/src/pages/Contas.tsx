import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { currencyBRL, type Conta } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { ContaModal } from '@/components/ContaModal'
import { ContaDrilldownModal } from '@/components/ContaDrilldownModal'

type Tab = 'todas' | 'bancaria' | 'digital' | 'cripto'

const TAB_LABEL: Record<Tab, string> = {
  todas: 'Todas',
  bancaria: 'Bancárias',
  digital: 'Digitais',
  cripto: 'Cripto',
}

export default function Contas() {
  const { data, loading, error, load, syncStatus } = useData()
  const [tab, setTab] = useState<Tab>('todas')
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
  const filtradas = tab === 'todas' ? contas : contas.filter((c) => (c.categoria ?? 'bancaria') === tab)
  const totalSaldo = filtradas.reduce((s, c) => s + (Number(c.saldo) || 0), 0)

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(c: Conta) {
    setDrilldown(null) // fecha drilldown se aberto
    setEditing(c); setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Contas</h1>
          <p className="text-sm text-mist">
            Saldos cadastrados nas suas contas.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Nova
        </Button>
      </header>

      {/* tabs por categoria */}
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ' +
                (active ? 'bg-elevated text-ink' : 'text-mist hover:text-ink')
              }
            >
              {TAB_LABEL[t]}
            </button>
          )
        })}
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {filtradas.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">
            {contas.length === 0
              ? 'Nenhuma conta cadastrada ainda.'
              : 'Nenhuma conta nesta categoria.'}
          </p>
          {contas.length === 0 && (
            <Button onClick={openNew} className="mt-4" size="sm">
              <Plus size={14} /> Adicionar primeira conta
            </Button>
          )}
        </div>
      )}

      {filtradas.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setDrilldown(c)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                style={{ borderTop: `3px solid ${c.cor ?? '#6b5ef5'}` }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                  {c.banco || ''}
                </div>
                <div className="text-[15px] font-bold text-ink">{c.nome}</div>
                <div className="mb-3 text-[11px] text-faint">{c.tipo || ''}</div>
                <div className="text-[11px] text-mist">Saldo</div>
                <div className="font-mono text-[22px] font-extrabold" style={{ color: c.cor ?? '#6b5ef5' }}>
                  {currencyBRL(c.saldo)}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-5 text-right text-xs text-mist">
            Total <span className="font-mono font-bold text-ink">{currencyBRL(totalSaldo)}</span>
            <span className="text-faint"> · {filtradas.length} {filtradas.length === 1 ? 'conta' : 'contas'}</span>
          </p>
        </>
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
