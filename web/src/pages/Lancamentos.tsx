import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import {
  getLancamentos,
  currencyBRL,
  getCategoryLabel,
  getCategoryColor,
  personColor,
  personInitial,
  type UnifiedLancamento,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { LancamentoModal } from '@/components/LancamentoModal'

function fmtDayHeader(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!y || !m || !d) return dateISO
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

interface LancamentosProps {
  /** se 'receita' ou 'despesa', filtra a tela; undefined = ambos. */
  kindFilter?: 'receita' | 'despesa'
}

export default function Lancamentos({ kindFilter }: LancamentosProps = {}) {
  const { data, loading, error, load, syncStatus } = useData()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedLancamento | null>(null)

  // Pré-seleciona o tipo no modal quando a tela é filtrada por receitas/despesas.
  // Truque: cria um "stub" de UnifiedLancamento só com kind, pra o modal
  // entrar no modo "Novo" mas com a aba certa.
  function openNew() {
    if (kindFilter) {
      setEditing({
        id: '', kind: kindFilter, date: '', desc: '', amount: 0, amountSigned: 0,
      } as UnifiedLancamento)
    } else {
      setEditing(null)
    }
    setModalOpen(true)
  }
  function openEdit(it: UnifiedLancamento) { setEditing(it); setModalOpen(true) }

  // Quando o modal é o "stub" pra novo (id===''), tratamos como Novo
  const editingForModal = editing && editing.id === '' ? null : editing
  const newKind = editing && editing.id === '' ? editing.kind : undefined

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const items = useMemo<UnifiedLancamento[]>(() => {
    if (!data) return []
    let xs = getLancamentos(data, { month, year })
    if (kindFilter) xs = xs.filter((x) => x.kind === kindFilter)
    if (q.trim()) {
      const needle = q.toLowerCase()
      xs = xs.filter(
        (x) =>
          x.desc.toLowerCase().includes(needle) ||
          (x.person ?? '').toLowerCase().includes(needle) ||
          getCategoryLabel(x.category).toLowerCase().includes(needle),
      )
    }
    return xs
  }, [data, month, year, q])

  const totalRec = items.filter((x) => x.kind === 'receita').reduce((s, x) => s + x.amount, 0)
  const totalDesp = items.filter((x) => x.kind === 'despesa').reduce((s, x) => s + x.amount, 0)

  // Agrupa por data (string ISO já é YYYY-MM-DD, ordena natural)
  const groups = useMemo(() => {
    const map = new Map<string, UnifiedLancamento[]>()
    for (const it of items) {
      const k = it.date || '—'
      const arr = map.get(k) ?? []
      arr.push(it)
      map.set(k, arr)
    }
    return [...map.entries()] // já vem ordenado por data DESC do getLancamentos
  }, [items])

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m); setYear(y)
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  })

  const title = kindFilter === 'receita' ? 'Receitas' : kindFilter === 'despesa' ? 'Despesas' : 'Lançamentos'
  const subtitle = kindFilter === 'receita'
    ? 'Entradas do mês.'
    : kindFilter === 'despesa'
      ? 'Saídas do mês.'
      : 'Receitas e despesas do mês.'
  const newLabel = kindFilter === 'receita' ? 'Nova receita' : kindFilter === 'despesa' ? 'Nova despesa' : 'Novo'

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="text-sm text-mist">
            {subtitle}
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
            {syncStatus === 'error' && <span className="ml-2 text-red">· erro de sync</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> {newLabel}
          </Button>
        </div>
      </header>

      <div className="mb-5 flex w-fit items-center gap-2 rounded-xl border border-line bg-surface px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-[140px] text-center text-sm font-medium capitalize text-ink">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por descrição, pessoa, categoria…"
            className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint outline-none focus:border-indigo"
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          {kindFilter !== 'despesa' && (
            <span className="text-mist">
              <span className="font-mono font-bold text-green">+{currencyBRL(totalRec)}</span> receitas
            </span>
          )}
          {kindFilter !== 'receita' && (
            <span className="text-mist">
              <span className="font-mono font-bold text-red">−{currencyBRL(totalDesp)}</span> despesas
            </span>
          )}
          <span className="text-faint">· {items.length} {items.length === 1 ? 'item' : 'itens'}</span>
        </div>
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {/* error de carga só impede a lista se NÃO há dado em memória/local */}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {!loading && items.length === 0 && (data || !error) && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">Nenhum lançamento neste mês.</p>
        </div>
      )}

      {items.length > 0 && (
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
                  onClick={() => openEdit(it)}
                  className="flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left last:border-b-0 hover:bg-elevated/30 focus:outline-none focus:bg-elevated/40"
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
                  <div
                    className={
                      'flex-shrink-0 font-mono text-sm font-bold ' +
                      (it.amountSigned >= 0 ? 'text-green' : 'text-red')
                    }
                  >
                    {it.amountSigned >= 0 ? '+' : '−'} {currencyBRL(it.amount)}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <LancamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingForModal}
        defaultKind={newKind}
      />
    </div>
  )
}
