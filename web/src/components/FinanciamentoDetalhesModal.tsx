import { useEffect, useMemo, useState } from 'react'
import {
  type Financiamento,
  type EstrategiaAntecipacao,
  currencyBRL,
  financiamentoAntecipar,
  financiamentoSimularSistema,
  getFinanciamentoResumo,
  FINANCIAMENTO_TIPOS,
} from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  financiamento: Financiamento | null
  onEdit: (f: Financiamento) => void
}

type Aba = 'resumo' | 'antecipar' | 'comparar'

export function FinanciamentoDetalhesModal({ open, onClose, financiamento, onEdit }: Props) {
  const anteciparFinanciamento = useData((s) => s.anteciparFinanciamento)
  const [aba, setAba] = useState<Aba>('resumo')
  const [valorExtra, setValorExtra] = useState<string>('')
  const [estrategia, setEstrategia] = useState<EstrategiaAntecipacao>('prazo')
  const [confirmandoAplicar, setConfirmandoAplicar] = useState(false)

  useEffect(() => {
    if (!open) return
    setAba('resumo')
    setValorExtra('')
    setEstrategia('prazo')
    setConfirmandoAplicar(false)
  }, [open, financiamento?.id])

  const resumo = useMemo(
    () => (financiamento ? getFinanciamentoResumo(financiamento) : null),
    [financiamento],
  )

  const simAntec = useMemo(() => {
    if (!financiamento) return null
    const v = parseFloat(valorExtra.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return null
    return financiamentoAntecipar(financiamento, v, estrategia)
  }, [financiamento, valorExtra, estrategia])

  const simSistema = useMemo(() => {
    if (!financiamento) return null
    const alvo = financiamento.sistema === 'price' ? 'sac' : 'price'
    const atual = financiamentoSimularSistema(financiamento, financiamento.sistema)
    const novo = financiamentoSimularSistema(financiamento, alvo)
    return { atual, novo, alvo }
  }, [financiamento])

  if (!financiamento || !resumo) return null

  const tipoInfo = FINANCIAMENTO_TIPOS.find((t) => t.id === financiamento.tipo)

  function aplicarAntecipacao() {
    if (!financiamento) return
    const v = parseFloat(valorExtra.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return
    anteciparFinanciamento(financiamento.id, v, estrategia)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={financiamento.label || 'Financiamento'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => onEdit(financiamento)}>Editar</Button>
        </>
      }
    >
      {/* Header com KPI saldo + tipo */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wide text-slate">
          {tipoInfo?.label ?? financiamento.tipo ?? ''}
          {financiamento.banco ? ' · ' + financiamento.banco : ''}
          {' · '}{financiamento.sistema.toUpperCase()}
        </div>
        <div className="font-mono text-2xl font-extrabold text-red">
          {currencyBRL(resumo.saldoAtual)}
        </div>
        <div className="text-[11px] text-faint">saldo devedor atual</div>
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-elevated p-1">
        {([
          ['resumo', 'Resumo'],
          ['antecipar', 'Simular antecipação'],
          ['comparar', 'Comparar SAC/Price'],
        ] as Array<[Aba, string]>).map(([k, label]) => {
          const active = aba === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' +
                (active ? 'bg-surface text-ink' : 'text-mist hover:text-ink')
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {aba === 'resumo' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Parcela atual" value={currencyBRL(resumo.parcelaAtual)} sub={`${resumo.pagas}/${financiamento.prazo}`} />
          <Kpi label="Próxima parcela" value={currencyBRL(resumo.parcelaProxima)} sub={`+${resumo.restantes} restantes`} />
          <Kpi label="Total já pago" value={currencyBRL(resumo.totalPago)} sub={`${resumo.pctPago.toFixed(0)}% quitado`} />
          <Kpi label="Total a pagar (restante)" value={currencyBRL(resumo.totalRestante)} sub="capital + juros" />
          <Kpi label="Total de juros (contrato)" value={currencyBRL(resumo.totalJuros)} sub={`taxa ${financiamento.taxaMensal}% a.m.`} />
          <Kpi label="CET aproximado (a.a.)" value={`${resumo.cetAnual.toFixed(2)}%`} sub="(1+i)^12 − 1" />
        </div>
      )}

      {aba === 'antecipar' && (
        <div>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Valor extra (R$)">
              <Input
                type="number"
                step="100"
                inputMode="decimal"
                value={valorExtra}
                onChange={(e) => setValorExtra(e.target.value)}
                placeholder="Ex.: 5000"
                autoFocus
              />
            </Field>
            <Field label="Estratégia">
              <div className="inline-flex h-10 rounded-lg border border-line-2 bg-elevated p-0.5">
                {(['prazo', 'parcela'] as EstrategiaAntecipacao[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEstrategia(s)}
                    className={
                      'flex-1 rounded-md px-3 text-xs font-semibold transition-colors ' +
                      (estrategia === s ? 'bg-surface text-ink' : 'text-mist hover:text-ink')
                    }
                  >
                    {s === 'prazo' ? 'Encurtar prazo' : 'Reduzir parcela'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Comparativo lado a lado */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Sem antecipação */}
            <div className="rounded-2xl border border-line bg-elevated p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                Sem antecipação
              </div>
              <div className="mt-2 text-sm text-mist">
                Parcelas restantes: <span className="font-mono font-bold text-ink">{resumo.restantes}</span>
              </div>
              <div className="text-sm text-mist">
                Total a pagar: <span className="font-mono font-bold text-ink">{currencyBRL(resumo.totalRestante)}</span>
              </div>
              <div className="text-sm text-mist">
                Juros restantes: <span className="font-mono font-bold text-ink">{currencyBRL(resumo.totalRestante - resumo.saldoAtual)}</span>
              </div>
            </div>

            {/* Com antecipação */}
            <div className="rounded-2xl border border-indigo/40 bg-indigo/5 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">
                Com antecipação
              </div>
              {!simAntec && (
                <div className="mt-3 text-xs text-faint">
                  Informe um valor para ver o comparativo.
                </div>
              )}
              {simAntec?.quitacao && (
                <div className="mt-2 text-sm text-mist">
                  <div className="font-bold text-green">Quita o financiamento.</div>
                  <div>Meses economizados: <span className="font-mono font-bold text-ink">{simAntec.mesesEconomizados}</span></div>
                  <div>Juros evitados: <span className="font-mono font-bold text-green">{currencyBRL(simAntec.jurosEconomizados)}</span></div>
                </div>
              )}
              {simAntec && !simAntec.quitacao && (
                <div className="mt-2 text-sm text-mist">
                  {estrategia === 'prazo' && (
                    <>
                      <div>Novo prazo: <span className="font-mono font-bold text-ink">{simAntec.novosMeses} meses</span></div>
                      <div>Meses economizados: <span className="font-mono font-bold text-green">{simAntec.mesesEconomizados}</span></div>
                    </>
                  )}
                  {estrategia === 'parcela' && (
                    <>
                      <div>Nova parcela: <span className="font-mono font-bold text-ink">{currencyBRL(simAntec.novaParcela ?? 0)}</span></div>
                      <div>Redução por parcela: <span className="font-mono font-bold text-green">{currencyBRL(simAntec.reducaoParcela ?? 0)}</span></div>
                    </>
                  )}
                  <div>Juros economizados: <span className="font-mono font-bold text-green">{currencyBRL(simAntec.jurosEconomizados)}</span></div>
                </div>
              )}
            </div>
          </div>

          {simAntec && (
            <div className="mt-4 flex items-center justify-end gap-2">
              {!confirmandoAplicar && (
                <Button variant="outline" size="sm" onClick={() => setConfirmandoAplicar(true)}>
                  Aplicar antecipação
                </Button>
              )}
              {confirmandoAplicar && (
                <>
                  <span className="text-xs text-mist">Confirmar registro?</span>
                  <Button variant="outline" size="sm" onClick={() => setConfirmandoAplicar(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={aplicarAntecipacao}>
                    Confirmar
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {aba === 'comparar' && simSistema && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-elevated p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
              Sistema atual: {simSistema.atual.sistema.toUpperCase()}
            </div>
            <div className="mt-2 text-sm text-mist">
              1ª parcela: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.atual.parcelaInicial)}</span>
            </div>
            <div className="text-sm text-mist">
              Última parcela: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.atual.parcelaFinal)}</span>
            </div>
            <div className="text-sm text-mist">
              Total pago: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.atual.totalPago)}</span>
            </div>
            <div className="text-sm text-mist">
              Total juros: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.atual.totalJuros)}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo/40 bg-indigo/5 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">
              Hipotético: {simSistema.alvo.toUpperCase()}
            </div>
            <div className="mt-2 text-sm text-mist">
              1ª parcela: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.novo.parcelaInicial)}</span>
            </div>
            <div className="text-sm text-mist">
              Última parcela: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.novo.parcelaFinal)}</span>
            </div>
            <div className="text-sm text-mist">
              Total pago: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.novo.totalPago)}</span>
            </div>
            <div className="text-sm text-mist">
              Total juros: <span className="font-mono font-bold text-ink">{currencyBRL(simSistema.novo.totalJuros)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-3">
      <div className="text-[10.5px] uppercase tracking-wide text-slate">{label}</div>
      <div className="font-mono text-base font-bold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  )
}
