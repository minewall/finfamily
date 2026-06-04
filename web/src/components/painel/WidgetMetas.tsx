// Widget: Metas em Destaque — top 3 por progresso.
import { Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { calcMetaProgresso, currencyBRL } from '@haile/shared'
import type { UserData, Meta } from '@haile/shared'

interface Props {
  data: UserData
}

export function WidgetMetas({ data }: Props) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const ativas: Meta[] = (data.metas ?? []).filter((m) => m.active !== false)
  const ranked = ativas
    .map((m) => ({ meta: m, prog: calcMetaProgresso(m, data, month, year) }))
    .sort((a, b) => b.prog.pct - a.prog.pct)
    .slice(0, 3)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-indigo" />
          <h3 className="text-sm font-semibold text-ink">Metas em Destaque</h3>
        </div>
        <Link to="/metas" className="text-[11px] text-mist hover:text-ink">
          Ver todas
        </Link>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg/40 p-4 text-center">
          <p className="text-sm text-mist">Você ainda não definiu metas.</p>
          <Link
            to="/metas"
            className="mt-2 inline-block text-xs font-medium text-indigo hover:underline"
          >
            Criar primeira meta
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {ranked.map(({ meta, prog }) => {
            const pctNum = Math.round(prog.pct * 100)
            const tone = prog.estourou ? 'bg-red' : 'bg-indigo'
            return (
              <li key={meta.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-medium text-ink">
                    {meta.label || 'Meta'}
                  </div>
                  <div className="font-mono text-[11px] text-mist">{pctNum}%</div>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className={`h-full ${tone}`}
                    style={{ width: `${Math.min(100, Math.max(0, pctNum))}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                  <span>{currencyBRL(prog.atual)}</span>
                  <span>de {currencyBRL(prog.alvo)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
