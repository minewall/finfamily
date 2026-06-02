import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { currencyBRL } from '@haile/shared'
import { ChartTooltip } from './ChartTooltip'

export interface DonutChartDatum {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  data: DonutChartDatum[]
  /** Texto exibido no centro do donut (ex: total). */
  totalLabel?: string
  /** Sub-texto pequeno no centro (default: "Total"). */
  totalHint?: string
  height?: number
  title?: string
}

/**
 * Donut com legenda lateral. Container: bg-surface, border-line, rounded-2xl,
 * p-4. Mostra valores grandes no centro quando `totalLabel` é fornecido.
 */
export function DonutChart({
  data,
  totalLabel,
  totalHint = 'Total',
  height = 240,
  title,
}: DonutChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0)

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-mist">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          {title}
        </h3>
      )}
      {isEmpty ? (
        <div className="grid place-items-center py-8 text-sm text-mist">Sem dados</div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
          <div className="relative w-full max-w-[260px] flex-shrink-0">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={1}
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell key={`${d.label}-${i}`} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <ChartTooltip {...props} formatter={(v) => currencyBRL(v)} />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {totalLabel && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                  {totalHint}
                </div>
                <div className="font-mono text-lg font-extrabold text-ink">{totalLabel}</div>
              </div>
            )}
          </div>
          <ul className="flex-1 space-y-1.5 self-center text-xs">
            {data.map((d) => (
              <li key={d.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-ink">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="font-mono font-bold text-ink whitespace-nowrap">
                  {currencyBRL(d.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
