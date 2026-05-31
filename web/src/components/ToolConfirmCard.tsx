import { TOOL_LABELS, type CoachToolName } from '@haile/shared'
import { Check, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PendingProps {
  kind: 'pending'
  name: CoachToolName
  input: Record<string, unknown>
  onConfirm: () => void
  onCancel: () => void
}
interface DoneProps {
  kind: 'done'
  name: CoachToolName
  input: Record<string, unknown>
  summary: string
  isError?: boolean
}
interface CancelledProps {
  kind: 'cancelled'
  name: CoachToolName
  input: Record<string, unknown>
}
type Props = PendingProps | DoneProps | CancelledProps

function formatFieldKey(k: string): string {
  if (k === 'descricao') return 'Descrição'
  if (k === 'valor') return 'Valor'
  if (k === 'data') return 'Data'
  if (k === 'pessoa') return 'Pessoa'
  if (k === 'categoria') return 'Categoria'
  if (k === 'sub') return 'Sub-categoria'
  if (k === 'tipo') return 'Tipo'
  if (k === 'id') return 'ID'
  return k
}
function formatFieldValue(k: string, v: unknown): string {
  if (typeof v === 'number' && (k === 'valor' || k === 'amount')) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (typeof v === 'string') return v
  return String(v ?? '—')
}

function bulkSummary(items: unknown): { count: number; total: number; samples: string[] } {
  if (!Array.isArray(items)) return { count: 0, total: 0, samples: [] }
  const count = items.length
  let total = 0
  const samples: string[] = []
  items.forEach((it, i) => {
    const r = it as Record<string, unknown>
    const v = typeof r.valor === 'number' ? r.valor : parseFloat(String(r.valor ?? ''))
    if (Number.isFinite(v)) total += v
    if (i < 3) samples.push(`${r.descricao ?? '—'} · ${typeof v === 'number' && Number.isFinite(v)
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}`)
  })
  return { count, total, samples }
}

export function ToolConfirmCard(props: Props) {
  const label = TOOL_LABELS[props.name]?.titulo ?? props.name
  const isBulk = props.name === 'bulkAddDespesas' || props.name === 'bulkAddReceitas'
  const fields = isBulk ? [] : Object.entries(props.input).filter(([, v]) => v !== undefined && v !== null && v !== '')
  const bulk = isBulk ? bulkSummary((props.input as Record<string, unknown>).items) : null
  const isDelete = props.name === 'deleteDespesa'
  const accentClass = isDelete ? 'border-red/40 bg-red/5' : 'border-indigo/40 bg-indigo/5'

  return (
    <div className={cn('rounded-xl border p-3 text-sm', accentClass)}>
      <div className="mb-2 flex items-center gap-2">
        {isDelete && <Trash2 size={14} className="text-red" />}
        <span className={cn('text-[10.5px] font-bold uppercase tracking-wide', isDelete ? 'text-red' : 'text-indigo')}>
          {label}
        </span>
        {props.kind === 'done' && !props.isError && (
          <CheckCircle2 size={13} className="ml-auto text-green" />
        )}
        {props.kind === 'done' && props.isError && (
          <AlertCircle size={13} className="ml-auto text-red" />
        )}
        {props.kind === 'cancelled' && (
          <X size={13} className="ml-auto text-mist" />
        )}
      </div>

      {bulk ? (
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-mist">Total de itens</span>
            <span className="text-ink font-bold">{bulk.count}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-mist">Soma</span>
            <span className="text-ink font-mono font-bold">
              {bulk.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          {bulk.samples.length > 0 && (
            <div className="mt-2 border-t border-line pt-2 text-[11px] text-mist">
              <div className="mb-1 text-faint">Primeiros itens:</div>
              {bulk.samples.map((s, i) => <div key={i} className="truncate">· {s}</div>)}
              {bulk.count > bulk.samples.length && (
                <div className="text-faint">… +{bulk.count - bulk.samples.length} outros</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {fields.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-xs">
              <span className="text-mist">{formatFieldKey(k)}</span>
              <span className="text-ink font-medium text-right">{formatFieldValue(k, v)}</span>
            </div>
          ))}
        </div>
      )}

      {props.kind === 'pending' && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-mist hover:bg-elevated hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white',
              isDelete ? 'bg-red hover:opacity-90' : 'bg-indigo hover:bg-indigo-deep',
            )}
          >
            <Check size={12} /> Confirmar
          </button>
        </div>
      )}

      {props.kind === 'done' && (
        <div className={cn('mt-2 text-[11px]', props.isError ? 'text-red' : 'text-green')}>
          {props.summary}
        </div>
      )}
      {props.kind === 'cancelled' && (
        <div className="mt-2 text-[11px] text-mist">Ação cancelada.</div>
      )}
    </div>
  )
}
