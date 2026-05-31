import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  sumReceitas,
  sumDespesas,
  saldoMes,
  currencyBRL,
  calcPoderDeEscolha,
  breakdownPorCategoria,
  topDespesas,
  getCategoryLabel,
  getCategoryColor,
  personColor,
  personInitial,
} from '@haile/shared'
import { useData } from '@/store/useData'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function KpiTile({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{label}</div>
      <div className={`mt-1 font-mono text-xl font-extrabold ${tone}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  )
}

function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)) }

export default function VisaoGeral() {
  const { data, loading, error, load } = useData()

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  if (loading && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-mist">Carregando…</div>
  }
  if (error && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-red">Erro: {error}</div>
  }

  const d = data ?? {}
  const rec = sumReceitas(d, month, year)
  const desp = sumDespesas(d, month, year)
  const saldo = saldoMes(d, month, year)
  const pde = calcPoderDeEscolha(d, month, year)
  const cats = breakdownPorCategoria(d, month, year).slice(0, 6)
  const top = topDespesas(d, month, year, 5)
  const contas = d.contas ?? []
  const totalContas = contas.reduce((s, c) => s + (Number(c.saldo) || 0), 0)

  const pdeRatio = clamp(pde.pct)            // fração da receita "livre"
  const comprometidoRatio = clamp(1 - pdeRatio) // do total comprometido (essenciais)

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-7">
        <h1 className="text-2xl font-bold text-ink">Visão Geral</h1>
        <p className="text-sm text-mist capitalize">{MESES[month - 1]} de {year}</p>
      </header>

      {/* ── Hero: Poder de Escolha ────────────────────────────── */}
      <section className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-indigo/15 to-teal/10 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">
              Poder de Escolha
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold text-ink">
              {currencyBRL(pde.poderDeEscolha)}
            </div>
            <div className="mt-1 text-xs text-mist">
              {rec > 0
                ? `${Math.round(pdeRatio * 100)}% da sua receita está livre para suas escolhas.`
                : 'Cadastre suas receitas pra ver seu Poder de Escolha.'}
            </div>
          </div>
          <div className="text-right text-xs text-mist">
            <div>Receitas <span className="font-mono font-bold text-green">+{currencyBRL(rec)}</span></div>
            <div>Essenciais <span className="font-mono font-bold text-amber">−{currencyBRL(pde.pisoSobrevivencia)}</span></div>
          </div>
        </div>

        {/* Barra: livre × comprometido */}
        <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-elevated">
          <div className="flex h-full w-full">
            <div
              className="h-full bg-amber"
              style={{ width: `${comprometidoRatio * 100}%` }}
              title="Comprometido em essenciais"
            />
            <div
              className="h-full bg-indigo"
              style={{ width: `${pdeRatio * 100}%` }}
              title="Poder de Escolha"
            />
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-faint">
          <span><span className="inline-block h-2 w-2 rounded-full bg-amber align-middle" /> Essenciais</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-indigo align-middle" /> Livre</span>
        </div>
      </section>

      {/* ── KPIs simples ────────────────────────────────────── */}
      <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label="Receitas" value={currencyBRL(rec)} tone="text-green" />
        <KpiTile label="Despesas" value={currencyBRL(desp)} tone="text-red" />
        <KpiTile
          label="Saldo do mês"
          value={currencyBRL(saldo)}
          tone={saldo >= 0 ? 'text-ink' : 'text-red'}
        />
      </section>

      {/* ── Grid 2-col: breakdown + top despesas ─────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Breakdown */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
              Onde foi seu dinheiro
            </h2>
            <Link to="/despesas" className="text-xs text-indigo hover:underline">
              ver tudo →
            </Link>
          </div>
          {cats.length === 0 ? (
            <p className="text-sm text-mist">Sem despesas este mês.</p>
          ) : (
            <div className="space-y-3">
              {cats.map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: getCategoryColor(c.category) }}
                      />
                      <span className="text-ink">{getCategoryLabel(c.category)}</span>
                      <span className="text-faint">· {c.count}</span>
                    </span>
                    <span className="font-mono font-bold text-ink">{currencyBRL(c.total)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.pct * 100}%`, background: getCategoryColor(c.category) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top despesas */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
              Maiores despesas
            </h2>
            <Link to="/lancamentos" className="text-xs text-indigo hover:underline">
              ver tudo →
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="text-sm text-mist">Nenhuma despesa neste mês.</p>
          ) : (
            <div className="divide-y divide-line">
              {top.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <div
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: personColor(t.person) }}
                  >
                    {personInitial(t.person)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{t.desc || '—'}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-mist">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: getCategoryColor(t.category) }}
                      />
                      {getCategoryLabel(t.category)}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-red whitespace-nowrap">
                    − {currencyBRL(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Resumo de contas ──────────────────────────────────── */}
      {contas.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
              Contas
            </h2>
            <Link to="/contas" className="text-xs text-indigo hover:underline">
              gerenciar →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {contas.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-line bg-surface px-3 py-2"
                style={{ borderLeft: `3px solid ${c.cor ?? '#6b5ef5'}` }}
              >
                <div className="text-[10.5px] uppercase tracking-wide text-slate">{c.banco || c.nome}</div>
                <div className="font-mono text-sm font-bold" style={{ color: c.cor ?? '#6b5ef5' }}>
                  {currencyBRL(c.saldo)}
                </div>
              </div>
            ))}
            <div className="ml-auto text-xs text-mist">
              Total <span className="font-mono font-bold text-ink">{currencyBRL(totalContas)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
