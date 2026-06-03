import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currencyBRL } from '@haile/shared'
import { ChartTooltip, type TooltipPayloadItem } from './ChartTooltip'
import { useChartColors } from './useChartColors'

export interface StackedBarsDatum {
  label: string
  receita: number
  despesa: number
  /** Saldo do mês (receita - despesa). Usado só pra mostrar no tooltip. */
  saldo: number
}

export interface StackedBarsProps {
  data: StackedBarsDatum[]
  height?: number
  title?: string
}

/**
 * Barras empilhadas mostrando receita × despesa por período. Despesa é
 * desenhada negativa (abaixo do eixo) pra leitura "ganhos vs perdas". Saldo
 * aparece no tooltip.
 */
export function StackedBars({
  data,
  height = 240,
  title,
}: StackedBarsProps) {
  const colors = useChartColors()
  // Recharts não tem "stack divergente" nativo. Truque: desenhamos despesa
  // como valor NEGATIVO numa stack separada — assim receita sobe e despesa
  // desce, com 0 no meio.
  const chartData = data.map((d) => ({
    label: d.label,
    receita: d.receita,
    despesa: -Math.abs(d.despesa),
    despesaAbs: Math.abs(d.despesa),
    saldo: d.saldo,
  }))

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            content={(props) => {
              const payload = (props.payload ?? []) as ReadonlyArray<TooltipPayloadItem>
              const visible = payload.filter(
                (p) => p.dataKey === 'receita' || p.dataKey === 'despesa',
              ).map((p) => {
                const raw = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value
                const num = typeof raw === 'number' ? raw : Number(raw) || 0
                if (p.dataKey === 'despesa') {
                  return { ...p, value: Math.abs(num), name: 'Despesa' }
                }
                return { ...p, value: num, name: 'Receita' }
              })
              const item = payload[0]?.payload as { saldo?: number } | undefined
              const saldo = item?.saldo
              return (
                <ChartTooltip
                  active={props.active}
                  label={props.label}
                  payload={visible}
                  formatter={(v) => currencyBRL(v)}
                  footer={
                    saldo != null
                      ? () => (
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span style={{ color: colors.text }}>Saldo</span>
                            <span
                              className="font-mono font-bold"
                              style={{ color: saldo >= 0 ? colors.positive : colors.negative }}
                            >
                              {currencyBRL(saldo)}
                            </span>
                          </div>
                        )
                      : undefined
                  }
                />
              )
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-[11px]" style={{ color: colors.text }}>{value}</span>
            )}
          />
          <Bar
            dataKey="receita"
            name="Receita"
            fill={colors.positive}
            radius={[4, 4, 0, 0]}
            stackId="receita"
          />
          <Bar
            dataKey="despesa"
            name="Despesa"
            fill={colors.negative}
            radius={[0, 0, 4, 4]}
            stackId="despesa"
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
