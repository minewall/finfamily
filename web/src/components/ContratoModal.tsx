import { useEffect, useState } from 'react'
import {
  CATEGORIES,
  COMPROMISSO_TIPOS,
  PERIODICIDADES,
  type Contrato,
  type KindCompromisso,
  type NaturezaCompromisso,
  type Periodicidade,
} from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Contrato | null
  defaultNatureza?: NaturezaCompromisso
}

const expenseCats = Object.entries(CATEGORIES).filter(([k]) => k !== 'receita')

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ContratoModal({ open, onClose, editing, defaultNatureza }: Props) {
  const data = useData((s) => s.data)
  const addContrato = useData((s) => s.addContrato)
  const updateContrato = useData((s) => s.updateContrato)
  const deleteContrato = useData((s) => s.deleteContrato)

  const pessoas = (data?.pessoas as string[] | undefined) ?? ['Você']
  const contas = data?.contas ?? []

  const isEdit = !!editing

  const [label, setLabel] = useState(editing?.label ?? '')
  const [kind, setKind] = useState<KindCompromisso>(editing?.kind ?? 'despesa')
  const [natureza, setNatureza] = useState<NaturezaCompromisso>(
    editing?.natureza ?? defaultNatureza ?? 'recorrente',
  )
  const [tipoCompromisso, setTipoCompromisso] = useState<string>(
    editing?.tipoCompromisso ?? 'assinatura',
  )
  const [valor, setValor] = useState<string>(editing?.valorParcela?.toString() ?? '')
  const [entrada, setEntrada] = useState<string>(editing?.entrada?.toString() ?? '')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(
    editing?.periodicidade ?? 'mensal',
  )
  const [dataInicio, setDataInicio] = useState<string>(editing?.dataInicio ?? todayISO())
  const [dataFim, setDataFim] = useState<string>(editing?.dataFim ?? '')
  const [parcelasTotal, setParcelasTotal] = useState<string>(
    editing?.parcelasTotal?.toString() ?? (editing?.natureza === 'divida' ? '12' : '360'),
  )
  const [diaVencimento, setDiaVencimento] = useState<string>(
    editing?.diaVencimento?.toString() ?? '',
  )
  const [category, setCategory] = useState<string>(editing?.category ?? 'assinaturas')
  const [responsavel, setResponsavel] = useState<string>(
    editing?.responsavel ?? pessoas[0] ?? 'Você',
  )
  const [contaId, setContaId] = useState<string>(editing?.contaId ?? '')
  const [notas, setNotas] = useState<string>(editing?.notas ?? '')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setLabel(editing?.label ?? '')
    setKind(editing?.kind ?? 'despesa')
    setNatureza(editing?.natureza ?? defaultNatureza ?? 'recorrente')
    setTipoCompromisso(editing?.tipoCompromisso ?? 'assinatura')
    setValor(editing?.valorParcela?.toString() ?? '')
    setEntrada(editing?.entrada?.toString() ?? '')
    setPeriodicidade(editing?.periodicidade ?? 'mensal')
    setDataInicio(editing?.dataInicio ?? todayISO())
    setDataFim(editing?.dataFim ?? '')
    setParcelasTotal(
      editing?.parcelasTotal?.toString() ?? (editing?.natureza === 'divida' ? '12' : '360'),
    )
    setDiaVencimento(editing?.diaVencimento?.toString() ?? '')
    setCategory(editing?.category ?? 'assinaturas')
    setResponsavel(editing?.responsavel ?? pessoas[0] ?? 'Você')
    setContaId(editing?.contaId ?? '')
    setNotas(editing?.notas ?? '')
    setError(null)
    setSubmitting(false)
  }, [open, editing, defaultNatureza, pessoas])

  function save() {
    const v = parseFloat((valor || '').replace(',', '.'))
    if (!label.trim()) { setError('Informe o nome do compromisso.'); return }
    if (!Number.isFinite(v) || v <= 0) { setError('Valor da parcela precisa ser > 0.'); return }
    if (!dataInicio) { setError('Informe a data de início.'); return }
    if (natureza === 'divida' && !parcelasTotal) {
      setError('Para dívida, informe o número de parcelas.')
      return
    }

    const ptotal = parseInt(parcelasTotal, 10)
    if (!Number.isFinite(ptotal) || ptotal < 1) {
      setError('Número de parcelas precisa ser ≥ 1.')
      return
    }

    const diaV = diaVencimento ? parseInt(diaVencimento, 10) : undefined
    if (diaVencimento && (!Number.isFinite(diaV) || diaV! < 1 || diaV! > 31)) {
      setError('Dia de vencimento precisa estar entre 1 e 31.')
      return
    }

    setSubmitting(true)
    const payload: Partial<Contrato> = {
      label: label.trim(),
      kind,
      natureza,
      tipoCompromisso: natureza === 'recorrente' ? tipoCompromisso : undefined,
      valorParcela: v,
      entrada: entrada ? parseFloat(entrada.replace(',', '.')) || 0 : undefined,
      periodicidade,
      dataInicio,
      dataFim: dataFim || undefined,
      parcelasTotal: ptotal,
      diaVencimento: diaV,
      category: kind === 'despesa' ? category : undefined,
      responsavel,
      contaId: contaId || null,
      notas: notas.trim() || undefined,
      active: editing?.active !== false,
    }

    if (isEdit && editing) {
      updateContrato(editing.id, payload)
    } else {
      addContrato(payload as Contrato)
    }
    onClose()
  }

  function remove() {
    if (!editing) return
    const ok = confirm('Excluir este compromisso? A ação não pode ser desfeita.')
    if (!ok) return
    deleteContrato(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar compromisso' : 'Novo compromisso'}
      size="lg"
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" onClick={remove} className="mr-auto text-red hover:text-red">
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={submitting}>
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
      {/* Toggle natureza */}
      <div className="mb-4 inline-flex rounded-lg border border-line-2 bg-elevated p-0.5">
        <button
          type="button"
          onClick={() => setNatureza('recorrente')}
          className={
            'rounded-md px-4 py-1.5 text-xs font-bold transition-colors ' +
            (natureza === 'recorrente' ? 'bg-green/15 text-green' : 'text-mist hover:text-ink')
          }
        >
          Recorrente
        </button>
        <button
          type="button"
          onClick={() => setNatureza('divida')}
          className={
            'rounded-md px-4 py-1.5 text-xs font-bold transition-colors ' +
            (natureza === 'divida' ? 'bg-red/15 text-red' : 'text-mist hover:text-ink')
          }
        >
          Dívida
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Netflix, Aluguel, Financiamento do carro…"
            autoFocus
          />
        </Field>

        {natureza === 'recorrente' && (
          <Field
            label="Tipo"
            className="sm:col-span-2"
            hint={COMPROMISSO_TIPOS.find((t) => t.id === tipoCompromisso)?.desc}
          >
            <Select value={tipoCompromisso} onChange={(e) => setTipoCompromisso(e.target.value)}>
              {COMPROMISSO_TIPOS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Valor da parcela (R$)">
          <Input
            type="number" step="0.01" inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </Field>

        <Field label="Periodicidade">
          <Select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}>
            {PERIODICIDADES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Data de início">
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </Field>

        <Field
          label={natureza === 'divida' ? 'Nº de parcelas' : 'Nº de ocorrências'}
          hint={natureza === 'recorrente' ? 'Use um número alto para "vai durar muito tempo".' : undefined}
        >
          <Input
            type="number" min="1" step="1" inputMode="numeric"
            value={parcelasTotal}
            onChange={(e) => setParcelasTotal(e.target.value)}
          />
        </Field>

        <Field
          label={natureza === 'divida' ? 'Data fim (opcional)' : 'Data fim (opcional)'}
        >
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </Field>

        <Field label="Dia de vencimento (opcional)" hint="1 a 31, ajustado quando o mês não tem o dia.">
          <Input
            type="number" min="1" max="31" step="1" inputMode="numeric"
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(e.target.value)}
            placeholder="Ex: 10"
          />
        </Field>

        {natureza === 'divida' && (
          <Field label="Entrada (opcional, R$)">
            <Input
              type="number" step="0.01" inputMode="decimal"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="0,00"
            />
          </Field>
        )}

        {kind === 'despesa' && (
          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {expenseCats.map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Responsável">
          <Select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            {pessoas.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>

        {contas.length > 0 && (
          <Field label="Conta (opcional)">
            <Select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">— Nenhuma —</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Tipo de fluxo">
          <Select value={kind} onChange={(e) => setKind(e.target.value as KindCompromisso)}>
            <option value="despesa">Despesa (saída)</option>
            <option value="receita">Receita (entrada)</option>
          </Select>
        </Field>

        <Field label="Notas (opcional)" className="sm:col-span-2">
          <Input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalhes, observações, número do contrato…"
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
