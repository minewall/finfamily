import { useEffect, useMemo, useState } from 'react'
import { Plus, CreditCard, Calendar, Layers } from 'lucide-react'
import { currencyBRL } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { CartaoModal } from '@/components/CartaoModal'
import {
  cartaoKpis,
  parcelamentosAtivos,
  utilizadoMesCartao,
  cartaoNome,
  cartaoLimite,
  cartaoCor,
  cartaoFechamento,
  cartaoVencimento,
  shade,
  type CartaoLike,
} from '@/lib/cartao-stats'

export default function Cartoes() {
  const { data, loading, error, load, syncStatus } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CartaoLike | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const cartoes = useMemo<CartaoLike[]>(() => {
    if (!data) return []
    const raw = (data as unknown as { cartoes?: unknown }).cartoes
    return Array.isArray(raw) ? (raw as CartaoLike[]) : []
  }, [data])

  const kpis = useMemo(
    () => (data ? cartaoKpis(data, year, month) : { limiteTotal: 0, utilizadoMes: 0, parcelasMes: 0 }),
    [data, year, month],
  )

  const parcelamentos = useMemo(() => (data ? parcelamentosAtivos(data) : []), [data])

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(c: CartaoLike) {
    setEditing(c)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cartões</h1>
          <p className="text-sm text-mist">
            Limite, uso e parcelas em um lugar — pra você saber quanto ainda dá pra comprometer.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} /> Novo cartão
        </Button>
      </header>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard icon={<CreditCard size={16} />} label="Limite total" value={currencyBRL(kpis.limiteTotal)} tone="violet" />
        <KpiCard
          icon={<Calendar size={16} />}
          label="Utilizado este mês"
          value={currencyBRL(kpis.utilizadoMes)}
          tone="amber"
          sub={kpis.limiteTotal > 0 ? `${Math.round((kpis.utilizadoMes / kpis.limiteTotal) * 100)}% do limite` : undefined}
        />
        <KpiCard
          icon={<Layers size={16} />}
          label="Parcelas no mês"
          value={currencyBRL(kpis.parcelasMes)}
          tone="rose"
          sub={parcelamentos.length > 0 ? `${parcelamentos.length} parcelamento${parcelamentos.length === 1 ? '' : 's'} ativo${parcelamentos.length === 1 ? '' : 's'}` : undefined}
        />
      </div>

      {/* Empty state */}
      {cartoes.length === 0 && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">
            Cadastre seu primeiro cartão pra ver limite e parcelas em um lugar.
          </p>
          <Button onClick={openNew} className="mt-4" size="sm">
            <Plus size={14} /> Adicionar cartão
          </Button>
        </div>
      )}

      {/* Grid de cartões */}
      {cartoes.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cartoes.map((c) => {
              const cor = cartaoCor(c)
              const limite = cartaoLimite(c)
              const utilizado = data ? utilizadoMesCartao(data, c.id, year, month) : 0
              const pct = limite > 0 ? Math.min(100, Math.round((utilizado / limite) * 100)) : 0
              const fechamento = cartaoFechamento(c)
              const vencimento = cartaoVencimento(c)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-2xl p-5 text-left text-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-[1.01]"
                  style={{ background: `linear-gradient(135deg, ${cor} 0%, ${shade(cor, -20)} 100%)` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {c.banco || '—'}
                    </div>
                    <CreditCard size={18} className="opacity-70" />
                  </div>
                  <div className="mt-1 text-lg font-bold leading-tight">{cartaoNome(c) || 'Sem nome'}</div>
                  <div className="mt-4 font-mono text-sm tracking-wider opacity-90">
                    •••• {(c.ultimosDigitos as string | undefined) || '----'}
                  </div>

                  {/* barra de limite */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] opacity-80">
                      <span>Utilizado</span>
                      <span className="font-mono">
                        {currencyBRL(utilizado)} <span className="opacity-70">/ {currencyBRL(limite)}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div className="h-full bg-white/85 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-[10px] opacity-70">
                    <span>Fecha dia {fechamento ?? '—'}</span>
                    <span>Vence dia {vencimento ?? '—'}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Parcelamentos ativos */}
          {parcelamentos.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate">
                Parcelamentos ativos
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {parcelamentos.map((p) => {
                  const cartao = p.cartaoId ? cartoes.find((c) => c.id === p.cartaoId) : null
                  const cor = cartao ? cartaoCor(cartao) : '#6b5ef5'
                  const pct = p.parcelaTotal > 0 ? Math.round((p.parcelaAtual / p.parcelaTotal) * 100) : 0
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-line bg-surface p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-ink">{p.descricao}</div>
                        {cartao && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: cor }}
                          >
                            {cartao.banco || cartaoNome(cartao)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-mist">
                        Parcela {p.parcelaAtual} de {p.parcelaTotal}
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${pct}%`, background: cor }}
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-xs">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-faint">Valor parcela</div>
                          <div className="font-mono font-bold text-ink">{currencyBRL(p.valorParcela)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wide text-faint">Restante</div>
                          <div className="font-mono font-bold text-ink">{currencyBRL(p.totalRestante)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <CartaoModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone: 'violet' | 'amber' | 'rose'
}) {
  const toneClass =
    tone === 'violet'
      ? 'text-indigo'
      : tone === 'amber'
        ? 'text-amber'
        : 'text-red'
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl font-extrabold text-ink">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-faint">{sub}</div>}
    </div>
  )
}
