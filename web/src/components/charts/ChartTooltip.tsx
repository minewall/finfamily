import type { ReactNode } from 'react'
import { currencyBRL } from '@haile/shared'

export interface TooltipPayloadItem {
  name?: string | number
  value?: number | string | ReadonlyArray<string | number>
  color?: string
  dataKey?: string | number | ((obj: unknown) => unknown)
  payload?: Record<string, unknown>
}

export interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<TooltipPayloadItem>
  formatter?: (value: number) => string
  /** Render uma linha extra abaixo dos itens (ex: saldo calculado). */
  footer?: (payload: ReadonlyArray<TooltipPayloadItem>) => ReactNode
}

/**
 * Tooltip estilizado usado por todos os charts (passado via prop `content`
 * pro Recharts). Mantém o visual coerente com o design system: bg-elevated,
 * border-line-2, texto ink/mist e fontes mono pra valores.
 */
export function ChartTooltip({
  active,
  label,
  payload,
  formatter,
  footer,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const fmt = formatter ?? ((v: number) => currencyBRL(v))
  return (
    <div className="rounded-xl border border-line-2 bg-elevated px-3 py-2 text-xs shadow-lg">
      {label != null && (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mist">
          {String(label)}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((p, i) => {
          const raw = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value
          const numeric = typeof raw === 'number' ? raw : Number(raw) || 0
          const keyLabel =
            typeof p.dataKey === 'string' || typeof p.dataKey === 'number' ? p.dataKey : i
          const nameLabel =
            p.name ?? (typeof p.dataKey === 'string' || typeof p.dataKey === 'number' ? p.dataKey : '—')
          return (
            <div key={String(keyLabel)} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-ink">
                {p.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: p.color }}
                  />
                )}
                {nameLabel}
              </span>
              <span className="font-mono font-bold text-ink">{fmt(numeric)}</span>
            </div>
          )
        })}
        {footer && <div className="mt-1 border-t border-line pt-1">{footer(payload)}</div>}
      </div>
    </div>
  )
}
