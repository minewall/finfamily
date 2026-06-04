// Widget: Alertas — recados não-lidos urgentes ou avisos.
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRecados } from '@haile/shared'
import type { UserData, Recado, RecadoPrioridade } from '@haile/shared'

interface Props {
  data: UserData
}

function fmtRelTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

const ICON_BY_PRIO: Record<Exclude<RecadoPrioridade, 'info'>, typeof AlertCircle> = {
  urgente: AlertTriangle,
  aviso: AlertCircle,
}

const COLOR_BY_PRIO: Record<Exclude<RecadoPrioridade, 'info'>, string> = {
  urgente: 'text-red',
  aviso: 'text-amber',
}

export function WidgetAlertas({ data }: Props) {
  const all: Recado[] = getRecados(data, { apenasNaoLidos: true })
  const alertas = all
    .filter((r) => r.prioridade === 'urgente' || r.prioridade === 'aviso')
    .slice(0, 3)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-indigo" />
          <h3 className="text-sm font-semibold text-ink">Alertas</h3>
        </div>
        <Link to="/recados" className="text-[11px] text-mist hover:text-ink">
          Todos os recados
        </Link>
      </div>

      {alertas.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg/40 p-4 text-center">
          <p className="text-sm text-mist">Nenhum alerta pendente.</p>
          <p className="mt-1 text-[11px] text-faint">
            Tudo em dia. O Haile avisa quando algo precisar de atenção.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {alertas.map((r) => {
            const prio = r.prioridade as 'urgente' | 'aviso'
            const Icon = ICON_BY_PRIO[prio]
            const color = COLOR_BY_PRIO[prio]
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-bg/40 px-3 py-2.5"
              >
                <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{r.titulo}</div>
                  <div className="text-[11px] text-faint">{fmtRelTime(r.criadoEm)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
