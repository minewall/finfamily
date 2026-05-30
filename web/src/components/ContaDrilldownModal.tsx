import {
  type Conta,
  getContaResumo,
  currencyBRL,
  getCategoryLabel,
  getCategoryColor,
} from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  conta: Conta | null
  onEdit: (c: Conta) => void
  month: number
  year: number
}

export function ContaDrilldownModal({ open, onClose, conta, onEdit, month, year }: Props) {
  const data = useData((s) => s.data) ?? {}

  if (!conta) return null
  const resumo = getContaResumo(data, conta.id, { month, year, limite: 12 })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={conta.nome || 'Conta'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => onEdit(conta)}>Editar conta</Button>
        </>
      }
    >
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wide text-slate">
          {conta.banco || ''}{conta.tipo ? ' · ' + conta.tipo : ''}
        </div>
        <div className="font-mono text-2xl font-extrabold" style={{ color: conta.cor ?? '#6b5ef5' }}>
          {currencyBRL(conta.saldo)}
        </div>
        <div className="text-[11px] text-faint">saldo cadastrado</div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex-1 rounded-lg bg-elevated p-3">
          <div className="text-[10.5px] uppercase tracking-wide text-slate">Entradas (mês)</div>
          <div className="font-mono text-sm font-bold text-green">+ {currencyBRL(resumo.entradasMes)}</div>
        </div>
        <div className="flex-1 rounded-lg bg-elevated p-3">
          <div className="text-[10.5px] uppercase tracking-wide text-slate">Saídas (mês)</div>
          <div className="font-mono text-sm font-bold text-red">− {currencyBRL(resumo.saidasMes)}</div>
        </div>
      </div>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
        Últimos lançamentos
        {resumo.countTotal > resumo.recentes.length && (
          <span className="ml-1 font-normal text-faint">
            ({resumo.recentes.length} de {resumo.countTotal})
          </span>
        )}
      </div>

      {resumo.recentes.length === 0 ? (
        <p className="py-6 text-center text-sm text-mist">
          Nenhum lançamento amarrado a esta conta ainda.
          <br />
          <span className="text-xs text-faint">
            Ao criar/editar um lançamento, selecione esta conta no campo "Conta".
          </span>
        </p>
      ) : (
        <div>
          {resumo.recentes.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{m.desc || '—'}</div>
                <div className="flex items-center gap-2 text-[11px] text-faint">
                  <span>{m.date}</span>
                  {m.category && (
                    <>
                      <span>·</span>
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: getCategoryColor(m.category) }} />
                      <span>{getCategoryLabel(m.category)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={'font-mono text-sm font-bold whitespace-nowrap ' + (m.amountSigned >= 0 ? 'text-green' : 'text-red')}>
                {m.amountSigned >= 0 ? '+' : '−'} {currencyBRL(m.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
