import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currencyBRL } from '@haile/shared'
import { ChartTooltip } from './ChartTooltip'

export interface LineSeriesDatum {
  label: string
  value: number
}

export interface LineSeriesProps {
  data: LineSeriesDatum[]
  height?: number
  title?: string
  /** Cor da linha + gradient. Default = indigo. */
  color?: string
}

const GRADIENT_ID = 'haile-line-gradient'

/**
 * Linha simples com gradient suave abaixo dela. Container: bg-surface,
 * border-line, rounded-2xl, p-4. Tooltip via ChartTooltip.
 */
export function LineSeries({
  data,
  height = 200,
  title,
  color = '#6b5ef5',
}: LineSeriesProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-mist">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="label"
            stroke="currentColor"
            strokeOpacity={0.4}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            strokeOpacity={0.4}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompact(v)}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={(props) => (
              <ChartTooltip {...props} formatter={(v) => currencyBRL(v)} />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Valor"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${GRADIENT_ID})`}
            activeDot={{ r: 4, fill: color, stroke: 'transparent' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
