// Widget: Próximos Vencimentos — compromissos com vencimento nos próximos 7 dias.
import { Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { currencyBRL, getProximasParcelas } from '@haile/shared'
import type { UserData } from '@haile/shared'

interface Props {
  data: UserData
}

function fmtDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export function WidgetVencimentos({ data }: Props) {
  const proximas = getProximasParcelas(data, 7).slice(0, 5)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-indigo" />
          <h3 className="text-sm font-semibold text-ink">Próximos Vencimentos</h3>
        </div>
        <Link to="/compromissos" className="text-[11px] text-mist hover:text-ink">
          Ver todos
        </Link>
      </div>

      {proximas.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg/40 p-4 text-center">
          <p className="text-sm text-mist">Sem vencimentos nos próximos 7 dias.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {proximas.map((p) => {
            const atrasada = p.parcela.status === 'atrasada'
            return (
              <li
                key={`${p.contrato.id}-${p.ano}-${p.mes}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg/40 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold ${
                      atrasada
                        ? 'bg-red/15 text-red'
                        : 'bg-indigo/15 text-indigo'
                    }`}
                  >
                    {fmtDia(p.date)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {p.contrato.label || 'Compromisso'}
                    </div>
                    <div className="text-[11px] text-faint">
                      {atrasada ? 'Atrasada' : `Parcela ${p.parcela.num}/${p.contrato.parcelasTotal}`}
                    </div>
                  </div>
                </div>
                <div
                  className={`font-mono text-sm font-bold ${
                    p.contrato.kind === 'receita' ? 'text-green' : 'text-ink'
                  }`}
                >
                  {currencyBRL(p.valor)}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
