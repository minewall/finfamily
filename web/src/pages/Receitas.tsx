// Página dedicada de Receitas (Track M — redesign).
// - 6 KPIs no topo (Total Ano, Média Mensal, Meses OK, Melhor Mês, Valor Futuro, Meta Anual)
// - Tabela "Por Pessoa — {ANO}" (pessoa × meses + total)
// - Lista de receitas do mês corrente (visualização compacta)
//
// Reusa o LancamentoModal pra criar/editar.

import { useEffect, useMemo, useState } from 'react'
import { Banknote, Calendar, ChevronLeft, ChevronRight, Clock, Plus, Star, Target, TrendingUp } from 'lucide-react'
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
import { receitasKpis, receitasPorPessoaMes } from '@/lib/receita-stats'

const MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtDayHeader(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!y || !m || !d) return dateISO
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
}

function KpiCard({ label, value, hint, icon }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-slate">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-elevated">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 font-mono text-xl font-extrabold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-mist">{hint}</div>}
    </div>
  )
}

export default function Receitas() {
  const { data, loading, error, load, syncStatus } = useData()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UnifiedLancamento | null>(null)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  function openNew() {
    setEditing({
      id: '', kind: 'receita', date: '', desc: '', amount: 0, amountSigned: 0,
    } as UnifiedLancamento)
    setModalOpen(true)
  }
  function openEdit(it: UnifiedLancamento) {
    setEditing(it)
    setModalOpen(true)
  }
  const editingForModal = editing && editing.id === '' ? null : editing
  const newKind = editing && editing.id === '' ? editing.kind : undefined

  const kpis = useMemo(() => (data ? receitasKpis(data, year) : null), [data, year])
  const porPessoa = useMemo(() => (data ? receitasPorPessoaMes(data, year) : []), [data, year])

  // Totais por mês (rodapé da tabela) — somam as colunas de pessoas
  const totalPorMes = useMemo(() => {
    const arr = Array(12).fill(0)
    for (const row of porPessoa) {
      for (let i = 0; i < 12; i++) arr[i] += row.meses[i] || 0
    }
    return arr
  }, [porPessoa])

  const totalGeral = useMemo(() => totalPorMes.reduce((s, v) => s + v, 0), [totalPorMes])

  // Lista de receitas do mês corrente (preserva comportamento atual)
  const items = useMemo<UnifiedLancamento[]>(() => {
    if (!data) return []
    return getLancamentos(data, { month, year }).filter((x) => x.kind === 'receita')
  }, [data, month, year])

  const totalMes = items.reduce((s, x) => s + x.amount, 0)

  const groups = useMemo(() => {
    const map = new Map<string, UnifiedLancamento[]>()
    for (const it of items) {
      const k = it.date || '—'
      const arr = map.get(k) ?? []
      arr.push(it)
      map.set(k, arr)
    }
    return [...map.entries()]
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

  // ── Strings derivadas pros KPIs ────────────────────────────────────
  const metaPct = kpis?.metaAnual && kpis.metaAnual.meta > 0
    ? Math.min(1, kpis.metaAnual.atual / kpis.metaAnual.meta)
    : 0

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Receitas</h1>
          <p className="text-sm text-mist">
            Acompanhe juntos sua entrada do mês e do ano.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
            {syncStatus === 'error' && <span className="ml-2 text-red">· erro de sync</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Nova receita
          </Button>
        </div>
      </header>

      {/* Seletor de ano — pros KPIs e tabela */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex w-fit items-center gap-2 rounded-xl border border-line bg-surface px-1.5 py-1.5">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
            aria-label="Ano anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-[60px] text-center text-sm font-medium text-ink">{year}</div>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
            aria-label="Próximo ano"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="text-xs text-faint">Vamos olhar juntos como {year} se comportou.</span>
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}
      {error && !data && <p className="text-red">Erro: {error}</p>}

      {kpis && (
        <>
          {/* 6 KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard
              label={`Total ${year}`}
              value={currencyBRL(kpis.totalAno)}
              hint="Soma de todas as receitas no ano"
              icon={<Banknote size={14} className="text-green" />}
            />
            <KpiCard
              label="Média Mensal"
              value={currencyBRL(kpis.mediaMensal)}
              hint="Média dos meses com receita"
              icon={<TrendingUp size={14} className="text-teal" />}
            />
            <KpiCard
              label="Meses OK"
              value={`${kpis.mesesOk}/12`}
              hint={kpis.mesesOk > 0 ? 'Meses dentro do esperado' : 'Vamos construir essa base'}
              icon={<Calendar size={14} className="text-indigo" />}
            />
            <KpiCard
              label="Melhor Mês"
              value={kpis.melhorMes ? currencyBRL(kpis.melhorMes.valor) : '—'}
              hint={kpis.melhorMes ? `${MES_CURTO[kpis.melhorMes.month - 1]} ${year}` : 'Sem receitas neste ano'}
              icon={<Star size={14} className="text-amber" />}
            />
            <KpiCard
              label="Valor Futuro"
              value={currencyBRL(kpis.valorFuturo)}
              hint={kpis.valorFuturo > 0 ? 'Agendado no resto do ano' : 'Nada agendado adiante'}
              icon={<Clock size={14} className="text-blue" />}
            />

            {/* Meta Anual — card especial com barra de progresso (ou CTA) */}
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-slate">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-elevated">
                  <Target size={14} className="text-indigo" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">Meta Anual</span>
              </div>
              {kpis.metaAnual ? (
                <>
                  <div className="mt-3 font-mono text-xl font-extrabold text-ink">
                    {currencyBRL(kpis.metaAnual.atual)}
                  </div>
                  <div className="mt-1 text-xs text-mist">
                    de {currencyBRL(kpis.metaAnual.meta)} · {(metaPct * 100).toFixed(0)}%
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full bg-green"
                      style={{ width: `${(metaPct * 100).toFixed(1)}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-3 text-sm font-medium text-ink">Defina uma meta de receita</div>
                  <div className="mt-1 text-xs text-mist">
                    Crie uma meta mensal em <span className="font-medium text-ink">Metas</span> pra
                    acompanhar aqui.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabela Por Pessoa */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line bg-elevated/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
              Por Pessoa — {year}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="sticky left-0 z-10 bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
                      Pessoa
                    </th>
                    {MES_CURTO.map((m) => (
                      <th key={m} className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate">
                        {m}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porPessoa.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-6 text-center text-sm text-mist">
                        Sem receitas registradas em {year}.
                      </td>
                    </tr>
                  )}
                  {porPessoa.map((row) => (
                    <tr key={row.pessoa} className="border-t border-line/70">
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: personColor(row.pessoa) }}
                            title={row.pessoa}
                          >
                            {personInitial(row.pessoa)}
                          </span>
                          <span className="text-ink">{row.pessoa}</span>
                        </div>
                      </td>
                      {row.meses.map((v, i) => (
                        <td key={i} className={'px-2 py-2 text-right font-mono ' + (v > 0 ? 'text-ink' : 'text-faint')}>
                          {v > 0 ? currencyBRL(v) : '—'}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono font-bold text-green">
                        {currencyBRL(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {porPessoa.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-line-2 bg-elevated/30 font-bold">
                      <td className="sticky left-0 z-10 bg-elevated/30 px-4 py-2 text-ink">Total</td>
                      {totalPorMes.map((v, i) => (
                        <td key={i} className={'px-2 py-2 text-right font-mono ' + (v > 0 ? 'text-ink' : 'text-faint')}>
                          {v > 0 ? currencyBRL(v) : '—'}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono text-green">{currencyBRL(totalGeral)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* Lista de receitas do mês (compacta, com seletor de mês) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Receitas do mês</h2>
        <div className="flex items-center gap-3">
          <div className="flex w-fit items-center gap-2 rounded-xl border border-line bg-surface px-1.5 py-1.5">
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
          <span className="text-xs text-mist">
            <span className="font-mono font-bold text-green">+{currencyBRL(totalMes)}</span>
            <span className="ml-2 text-faint">· {items.length} {items.length === 1 ? 'item' : 'itens'}</span>
          </span>
        </div>
      </div>

      {!loading && items.length === 0 && (data || !error) && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-mist">Nenhuma receita neste mês.</p>
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
                  className="flex w-full items-center gap-3 border-b border-line/70 px-4 py-3 text-left last:border-b-0 hover:bg-elevated/30 focus:bg-elevated/40 focus:outline-none"
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
                  <div className="flex-shrink-0 font-mono text-sm font-bold text-green">
                    +{currencyBRL(it.amount)}
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
