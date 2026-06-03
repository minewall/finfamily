import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currencyBRL } from '@haile/shared'
import { ChartTooltip } from './ChartTooltip'
import { useChartColors } from './useChartColors'

export interface BarSeriesDatum {
  label: string
  value: number
}

export type BarTone = 'income' | 'expense' | 'neutral'

export interface BarSeriesProps {
  data: BarSeriesDatum[]
  tone?: BarTone
  height?: number
  /** Título opcional renderizado no container. */
  title?: string
}

/**
 * Barras verticais simples — uma série. Container: bg-surface, border-line,
 * rounded-2xl, p-4. Tooltip customizada via ChartTooltip.
 */
export function BarSeries({
  data,
  tone = 'neutral',
  height = 200,
  title,
}: BarSeriesProps) {
  const colors = useChartColors()
  const color =
    tone === 'income' ? colors.positive : tone === 'expense' ? colors.negative : colors.series[0]
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={colors.axis}
            tick={{ fill: colors.text, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={colors.axis}
            tick={{ fill: colors.text, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompact(v)}
            width={56}
          />
          <Tooltip
            cursor={{ fill: colors.text, fillOpacity: 0.08 }}
            content={(props) => (
              <ChartTooltip
                {...props}
                formatter={(v) => currencyBRL(v)}
              />
            )}
          />
          <Bar
            dataKey="value"
            name="Valor"
            fill={color}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
