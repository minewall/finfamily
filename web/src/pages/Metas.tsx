import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { calcMetaProgresso, currencyBRL, metaTipoLabel, type Meta } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { MetaModal } from '@/components/MetaModal'

function tipoColor(type?: string): string {
  switch (type) {
    case 'objetivo':    return '#6b5ef5' // indigo
    case 'reserva':     return '#2dcfc0' // teal
    case 'limite_desp': return '#ff4a68' // red
    case 'min_receita': return '#1dc97e' // green
    default: return '#454b6d'
  }
}

export default function Metas() {
  const { data, loading, error, load, syncStatus } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Meta | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const metas = (data?.metas ?? []) as Meta[]
  const ativas = metas.filter((m) => m.active !== false)

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(m: Meta) { setEditing(m); setModalOpen(true) }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Metas</h1>
          <p className="text-sm text-mist">
            Objetivos, reservas e limites — o Haile acompanha o progresso.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={14} /> Nova</Button>
      </header>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {ativas.length === 0 && (data || !error) && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">Nenhuma meta ativa ainda.</p>
          <Button onClick={openNew} className="mt-4" size="sm">
            <Plus size={14} /> Criar primeira meta
          </Button>
        </div>
      )}

      {ativas.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ativas.map((m) => {
            const prog = calcMetaProgresso(m, data ?? {}, month, year)
            const cor = tipoColor(m.type)
            const concluida = prog.pct >= 1 && !prog.estourou
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openEdit(m)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                style={{ borderTop: `3px solid ${cor}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: cor }}>
                    {metaTipoLabel(m.type)}
                  </span>
                  {prog.estourou && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-red">
                      <AlertTriangle size={11} /> estourou
                    </span>
                  )}
                  {concluida && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-green">
                      <CheckCircle2 size={11} /> concluída
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-[15px] font-bold text-ink line-clamp-2">{m.label}</h3>

                <div className="mt-3">
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-mono font-bold" style={{ color: prog.estourou ? '#ff4a68' : cor }}>
                      {currencyBRL(prog.atual)}
                    </span>
                    <span className="text-faint">de {currencyBRL(prog.alvo)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(prog.pct * 100)}%`,
                        background: prog.estourou ? '#ff4a68' : cor,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[11px] text-mist">
                    {Math.round(prog.pct * 100)}%
                  </div>
                </div>

                {typeof m.deadline === 'string' && m.deadline && (
                  <div className="mt-3 text-[11px] text-faint">
                    Prazo: {m.deadline}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <MetaModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  )
}
