import { useEffect } from 'react'
import { sumReceitas, sumDespesas, saldoMes, currencyBRL } from '@haile/shared'
import { useData } from '@/store/useData'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-extrabold ${tone}`}>{value}</div>
    </div>
  )
}

export default function VisaoGeral() {
  const { data, loading, error, load } = useData()
  const { signOut } = useAuth()

  useEffect(() => {
    void load()
  }, [load])

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const d = data ?? {}
  const rec = sumReceitas(d, month, year)
  const desp = sumDespesas(d, month, year)
  const saldo = saldoMes(d, month, year)
  const contas = d.contas ?? []

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="font-serif text-2xl text-ink">Haile</div>
          <div className="text-sm text-mist">Visão Geral · {String(month).padStart(2, '0')}/{year}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sair</Button>
      </header>

      {loading && <p className="text-mist">Carregando seus dados…</p>}
      {error && <p className="text-red">Erro: {error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Receitas (mês)" value={currencyBRL(rec)} tone="text-green" />
            <Kpi label="Despesas (mês)" value={currencyBRL(desp)} tone="text-red" />
            <Kpi label="Saldo (mês)" value={currencyBRL(saldo)} tone={saldo >= 0 ? 'text-ink' : 'text-red'} />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
              Contas {contas.length > 0 && <span className="text-faint">· {contas.length}</span>}
            </h2>
            {contas.length === 0 ? (
              <p className="text-sm text-mist">Nenhuma conta cadastrada ainda.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {contas.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-line bg-surface p-4"
                    style={{ borderTop: `3px solid ${c.cor ?? '#6b5ef5'}` }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{c.banco ?? ''}</div>
                    <div className="text-[15px] font-bold text-ink">{c.nome}</div>
                    <div className="mt-2 font-mono text-xl font-extrabold" style={{ color: c.cor ?? '#6b5ef5' }}>
                      {currencyBRL(c.saldo)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="mt-10 text-center text-xs text-faint">
            DUO (React) lendo o mesmo backend do Dino · {d.despesas?.length ?? 0} despesas · {d.receitas?.length ?? 0} receitas
          </p>
        </>
      )}
    </div>
  )
}
