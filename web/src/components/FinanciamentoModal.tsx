import { useState } from 'react'
import {
  type Financiamento,
  type SistemaAmortizacao,
  type Conta,
  FINANCIAMENTO_TIPOS,
} from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Financiamento | null
}

export function FinanciamentoModal({ open, onClose, editing }: Props) {
  const addFinanciamento = useData((s) => s.addFinanciamento)
  const updateFinanciamento = useData((s) => s.updateFinanciamento)
  const deleteFinanciamento = useData((s) => s.deleteFinanciamento)
  const data = useData((s) => s.data)
  const contas = (data?.contas ?? []) as Conta[]
  const pessoas = (data?.pessoas ?? []) as string[]

  const isEdit = !!editing
  const [label, setLabel] = useState(editing?.label ?? '')
  const [banco, setBanco] = useState(editing?.banco ?? '')
  const [tipo, setTipo] = useState<string>(editing?.tipo ?? FINANCIAMENTO_TIPOS[0].id)
  const [sistema, setSistema] = useState<SistemaAmortizacao>(editing?.sistema ?? 'price')
  const [valorFinanciado, setValor] = useState<string>(editing?.valorFinanciado?.toString() ?? '')
  const [taxaMensal, setTaxa] = useState<string>(editing?.taxaMensal?.toString() ?? '')
  const [prazo, setPrazo] = useState<string>(editing?.prazo?.toString() ?? '')
  const [parcelasPagas, setPagas] = useState<string>(editing?.parcelasPagas?.toString() ?? '0')
  const [dataInicio, setDataInicio] = useState<string>(
    editing?.dataInicio ?? new Date().toISOString().slice(0, 10),
  )
  const [contaId, setContaId] = useState<string>(editing?.contaId ?? '')
  const [person, setPerson] = useState<string>(editing?.person ?? '')
  const [notes, setNotes] = useState<string>(editing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  // Reset state ao abrir / trocar editing (padrão React docs: ajustar state sem useEffect)
  const [prevOpenKey, setPrevOpenKey] = useState<string>('')
  const openKey = open ? (editing?.id ?? 'new') : ''
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setLabel(editing?.label ?? '')
      setBanco(editing?.banco ?? '')
      setTipo(editing?.tipo ?? FINANCIAMENTO_TIPOS[0].id)
      setSistema(editing?.sistema ?? 'price')
      setValor(editing?.valorFinanciado?.toString() ?? '')
      setTaxa(editing?.taxaMensal?.toString() ?? '')
      setPrazo(editing?.prazo?.toString() ?? '')
      setPagas(editing?.parcelasPagas?.toString() ?? '0')
      setDataInicio(editing?.dataInicio ?? new Date().toISOString().slice(0, 10))
      setContaId(editing?.contaId ?? '')
      setPerson(editing?.person ?? '')
      setNotes(editing?.notes ?? '')
      setError(null)
    }
  }

  const tipoInfo = FINANCIAMENTO_TIPOS.find((t) => t.id === tipo) ?? FINANCIAMENTO_TIPOS[0]

  function save() {
    const v = parseFloat(valorFinanciado.replace(',', '.'))
    const i = parseFloat(taxaMensal.replace(',', '.'))
    const n = parseInt(prazo, 10)
    const k = parseInt(parcelasPagas, 10) || 0
    if (!label.trim()) { setError('Informe a descrição.'); return }
    if (!Number.isFinite(v) || v <= 0) { setError('Valor financiado inválido.'); return }
    if (!Number.isFinite(i) || i < 0) { setError('Taxa de juros inválida.'); return }
    if (!Number.isInteger(n) || n <= 0) { setError('Prazo deve ser > 0.'); return }
    if (k < 0 || k > n) { setError('Parcelas pagas fora do intervalo.'); return }
    const payload: Partial<Financiamento> = {
      label: label.trim(),
      banco: banco.trim() || undefined,
      tipo,
      sistema,
      valorFinanciado: v,
      taxaMensal: i,
      prazo: n,
      parcelasPagas: k,
      dataInicio,
      contaId: contaId || null,
      person: person || undefined,
      notes: notes.trim() || undefined,
    }
    if (isEdit && editing) updateFinanciamento(editing.id, payload)
    else addFinanciamento(payload as Omit<Financiamento, 'id'>)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Excluir este financiamento? Esta ação não pode ser desfeita.')) return
    deleteFinanciamento(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar financiamento' : 'Novo financiamento'}
      size="xl"
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" onClick={remove} className="mr-auto text-red hover:text-red">
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>{isEdit ? 'Salvar' : 'Criar'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Apto Vila Mariana"
            autoFocus
          />
        </Field>

        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {FINANCIAMENTO_TIPOS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Sistema">
          <div className="inline-flex rounded-lg border border-line-2 bg-elevated p-0.5">
            {(['price', 'sac'] as SistemaAmortizacao[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSistema(s)}
                className={
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ' +
                  (sistema === s ? 'bg-surface text-ink' : 'text-mist hover:text-ink')
                }
              >
                {s === 'price' ? 'Price (parcela fixa)' : 'SAC (decrescente)'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Banco / Credor" className="sm:col-span-2">
          <Input
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            placeholder="Caixa, Itaú, Santander..."
          />
        </Field>

        <Field label="Valor financiado (R$)">
          <Input
            type="number"
            step="1000"
            inputMode="decimal"
            value={valorFinanciado}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </Field>

        <Field label="Taxa de juros (% a.m.)" hint="Ex.: 0.8 para 0,8% ao mês">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={taxaMensal}
            onChange={(e) => setTaxa(e.target.value)}
            placeholder="0,80"
          />
        </Field>

        <Field label="Prazo (meses)">
          <Input
            type="number"
            step="1"
            min="1"
            max="600"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            placeholder="360"
          />
        </Field>

        <Field label="Parcelas já pagas">
          <Input
            type="number"
            step="1"
            min="0"
            value={parcelasPagas}
            onChange={(e) => setPagas(e.target.value)}
          />
        </Field>

        <Field label="Data do contrato">
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </Field>

        <Field label="Conta vinculada">
          <Select value={contaId} onChange={(e) => setContaId(e.target.value)}>
            <option value="">— sem conta —</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Select>
        </Field>

        <Field label="Pessoa">
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">— não atribuir —</option>
            {pessoas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </Field>

        <Field label="Observações" className="sm:col-span-2">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas"
          />
        </Field>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        {tipoInfo.desc} · Taxa típica a.a.: {tipoInfo.taxaMin}% – {tipoInfo.taxaMax}%
      </p>
      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
