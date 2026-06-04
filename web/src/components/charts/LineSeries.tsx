import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useId } from 'react'
import { currencyBRL } from '@haile/shared'
import { ChartTooltip } from './ChartTooltip'
import { useChartColors } from './useChartColors'

export interface LineSeriesDatum {
  label: string
  value: number
}

export interface LineSeriesProps {
  data: LineSeriesDatum[]
  height?: number
  title?: string
  /** Cor da linha + gradient. Default = primeiro da paleta sequencial do tema. */
  color?: string
}

/**
 * Linha simples com gradient suave abaixo dela. Container: bg-surface,
 * border-line, rounded-2xl, p-4. Tooltip via ChartTooltip.
 */
export function LineSeries({
  data,
  height = 200,
  title,
  color,
}: LineSeriesProps) {
  const colors = useChartColors()
  const stroke = color ?? colors.series[0]
  const gradientId = `haile-line-gradient-${useId().replace(/:/g, '')}`
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            cursor={{ stroke: colors.axis, strokeOpacity: 1 }}
            content={(props) => (
              <ChartTooltip {...props} formatter={(v) => currencyBRL(v)} />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Valor"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, fill: stroke, stroke: 'transparent' }}
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
