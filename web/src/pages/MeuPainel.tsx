import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  TrendingUp,
  TrendingDown,
  Scale,
  Mail,
  ReceiptText,
  ArrowRightLeft,
  Inbox,
  Check,
} from 'lucide-react'
import {
  currencyBRL,
  personColor,
  personInitial,
  calcContribuicaoMembro,
  computeContribuicoesByPerson,
  FAMILIA_COLETIVO,
} from '@haile/shared'
import type { Despesa, Receita, UserData } from '@haile/shared'
import { useAuth } from '@/lib/auth'
import { useData } from '@/store/useData'
import { useFamily } from '@/store/useFamily'
import { Button } from '@/components/ui/button'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/**
 * Resolve a "pessoa do user logado" no blob `data`:
 *  - Member: usa context.pessoaName (definido no convite).
 *  - Owner solo: usa a primeira pessoa cadastrada (heurística do Dino).
 *  - Fallback: primeiro nome do e-mail.
 */
function resolveEu(
  data: UserData | null,
  pessoaContext: string | null | undefined,
  email: string | undefined,
): string {
  if (pessoaContext) return pessoaContext
  const list = data?.pessoas ?? []
  if (list.length) return list[0]
  if (email) {
    const part = email.split('@')[0]
    return part.charAt(0).toUpperCase() + part.slice(1)
  }
  return 'Eu'
}

export default function MeuPainel() {
  const { session } = useAuth()
  const { data, loading, load } = useData()
  const { context, myPendingInvites, loadFamily, accept } = useFamily()

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])
  useEffect(() => {
    void loadFamily()
  }, [loadFamily])

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const email = session?.user?.email ?? ''
  const eu = useMemo(
    () => resolveEu(data, context?.pessoaName, email),
    [data, context, email],
  )

  // ── KPIs do mês para "eu" ────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!data) return { receita: 0, despesa: 0, liquido: 0, pctReceita: 0, pctDespesa: 0 }
    const c = calcContribuicaoMembro(data, eu, year, month)
    return {
      receita: c.receita,
      despesa: c.despesa,
      liquido: c.contribuicaoLiquida,
      pctReceita: c.pctReceita,
      pctDespesa: c.pctDespesa,
    }
  }, [data, eu, year, month])

  // ── Últimos lançamentos onde "eu" aparece (até 10) ───────────────
  const ultimos = useMemo(() => {
    if (!data) return [] as Array<{
      kind: 'receita' | 'despesa'
      id: string
      label: string
      date: string
      valorMeu: number
      partilhado: boolean
    }>
    type Linha = { kind: 'receita' | 'despesa'; id: string; label: string; date: string; valorMeu: number; partilhado: boolean }
    const out: Linha[] = []

    for (const r of (data.receitas ?? []) as Receita[]) {
      if (r.person !== eu) continue
      out.push({
        kind: 'receita',
        id: r.id,
        label: r.desc || r.category || 'Receita',
        date: r.date || '',
        valorMeu: r.amount || 0,
        partilhado: false,
      })
    }
    for (const d of (data.despesas ?? []) as Despesa[]) {
      const contrib = computeContribuicoesByPerson(d)
      const meu = contrib[eu] ?? 0
      if (meu <= 0) continue
      const partilhado = Array.isArray(d.split) && d.split.length > 0 && d.person !== eu
      out.push({
        kind: 'despesa',
        id: d.id,
        label: d.desc || d.category || 'Despesa',
        date: d.date || '',
        valorMeu: meu,
        partilhado,
      })
    }
    out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return out.slice(0, 10)
  }, [data, eu])

  async function handleAccept(memberId: string) {
    const res = await accept(memberId)
    if ('error' in res) alert(res.error)
    else if ('expired' in res) alert('Esse convite expirou. Peça pra quem te convidou reenviar.')
    else if ('ok' in res) {
      alert('Convite aceito! Você agora faz parte dessa família.')
      window.location.reload()
    }
  }

  if (loading && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-mist">Carregando…</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Header com identidade do user */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: personColor(eu) }}
        >
          {personInitial(eu)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-ink">Meu Painel</h1>
          <p className="text-sm text-mist">
            {eu === FAMILIA_COLETIVO ? 'Visão coletiva' : `Sua visão individual${email ? ' · ' + email : ''}`}
          </p>
          {context && (
            <p className="mt-1 text-[11px] text-faint">
              {context.role === 'admin'
                ? 'Você administra a família.'
                : `Você participa de uma família como ${context.role}.`}
            </p>
          )}
        </div>
        <Link
          to="/familia"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-mist hover:bg-elevated hover:text-ink"
        >
          Ver Painel da Família
        </Link>
      </header>

      {/* Convites recebidos pra ENTRAR em família */}
      {myPendingInvites.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber/40 bg-amber/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber">
            <Inbox size={16} />
            <span className="text-sm font-semibold">
              Você tem {myPendingInvites.length} convite{myPendingInvites.length === 1 ? '' : 's'} pra entrar em uma família
            </span>
          </div>
          <ul className="space-y-2">
            {myPendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/30 bg-bg/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">Convite pendente</div>
                  <div className="text-[11px] text-mist">Papel: {inv.role}</div>
                </div>
                <Button variant="primary" size="sm" onClick={() => void handleAccept(inv.id)}>
                  <Check size={14} /> Aceitar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Seletor de mês */}
      <section className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-indigo/10 to-teal/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            >
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            >
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-baseline gap-6">
            <Kpi
              label="Minha receita"
              value={currencyBRL(kpis.receita)}
              icon={<TrendingUp size={14} />}
              tone="text-green"
            />
            <Kpi
              label="Minha despesa"
              value={currencyBRL(kpis.despesa)}
              icon={<TrendingDown size={14} />}
              tone="text-red"
            />
            <Kpi
              label="Saldo líquido"
              value={currencyBRL(kpis.liquido)}
              icon={<Scale size={14} />}
              tone={kpis.liquido >= 0 ? 'text-green' : 'text-red'}
            />
          </div>
        </div>
        {(kpis.pctReceita > 0 || kpis.pctDespesa > 0) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ShareBar label="Sua fatia da receita da família" pct={kpis.pctReceita} color="bg-green" />
            <ShareBar label="Sua fatia da despesa da família" pct={kpis.pctDespesa} color="bg-red" />
          </div>
        )}
      </section>

      {/* Últimos lançamentos */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
            Últimos lançamentos onde você aparece
          </h2>
          <Link to="/lancamentos" className="text-xs text-mist hover:text-ink">
            Ver todos
          </Link>
        </div>
        {ultimos.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <ReceiptText size={22} className="mx-auto mb-2 text-faint" />
            <div className="font-medium text-ink">Sem lançamentos seus ainda</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-mist">
              Quando você lançar receita ou despesa marcando seu nome (ou aparecer em um split), entra aqui.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ultimos.map((l) => (
              <li
                key={`${l.kind}-${l.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full ${l.kind === 'receita' ? 'bg-green/15 text-green' : 'bg-red/15 text-red'}`}
                  >
                    {l.kind === 'receita' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      {l.label}
                      {l.partilhado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo/15 px-2 py-0.5 text-[10px] font-semibold text-indigo">
                          <ArrowRightLeft size={10} /> sua parte
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-faint">{l.date}</div>
                  </div>
                </div>
                <div
                  className={`font-mono text-sm font-bold ${l.kind === 'receita' ? 'text-green' : 'text-red'}`}
                >
                  {l.kind === 'despesa' ? '−' : ''}
                  {currencyBRL(l.valorMeu)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer hint */}
      <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-mist">
        <User size={12} className="mr-1 inline" />
        Esta é sua visão individual. Pra ver o consolidado da família,{' '}
        <Link to="/familia" className="text-indigo hover:underline">
          abra o Painel da Família
        </Link>
        .
        {email && (
          <>
            {' '}
            <Mail size={12} className="ml-2 mr-1 inline" />
            {email}
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
        {icon} {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  )
}

function ShareBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-mist">
        <span>{label}</span>
        <span>{clamped.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
