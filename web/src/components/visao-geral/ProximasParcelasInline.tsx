import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { currencyBRL } from '@haile/shared'
import type { ProximaParcelaInline } from '@/lib/visao-geral-stats'

interface Props {
  parcelas: ProximaParcelaInline[]
}

function formatDateBR(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function diasLabel(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)}d atrás`
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  return `em ${dias}d`
}

export default function ProximasParcelasInline({ parcelas }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-indigo" strokeWidth={2.2} />
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate">
            Próximas a vencer
          </h3>
        </div>
        <Link to="/compromissos" className="text-xs text-indigo hover:underline">
          ver tudo →
        </Link>
      </div>

      {parcelas.length === 0 ? (
        <p className="text-sm text-mist">Nada a vencer nos próximos dias.</p>
      ) : (
        <ul className="divide-y divide-line">
          {parcelas.map((p) => {
            const urgente = p.diasAteVencimento <= 3
            const vencida = p.diasAteVencimento < 0
            return (
              <li key={`${p.id}-${p.vencimento}`} className="flex items-center gap-3 py-2.5">
                <div className="grid h-10 w-12 flex-shrink-0 flex-col place-items-center rounded-xl border border-line bg-elevated/40 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate leading-none">
                    {formatDateBR(p.vencimento).split('/')[1]}
                  </div>
                  <div className="font-mono text-sm font-bold text-ink leading-none mt-0.5">
                    {formatDateBR(p.vencimento).split('/')[0]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{p.label}</div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={vencida ? 'text-red' : urgente ? 'text-amber' : 'text-faint'}>
                      {diasLabel(p.diasAteVencimento)}
                    </span>
                    {(urgente || vencida) && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${
                          vencida ? 'bg-red/15 text-red' : 'bg-amber/15 text-amber'
                        }`}
                      >
                        {vencida ? 'atrasada' : 'urgente'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-ink whitespace-nowrap">
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
