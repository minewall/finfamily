import { useMemo, useState } from 'react'
import type { Passivo } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Passivo | null
}

const TIPOS: Array<[string, string]> = [
  ['banco', 'Banco'],
  ['cartao', 'Cartão'],
  ['empresarial', 'Empresarial'],
  ['pessoal', 'Pessoal'],
  ['emprestimo', 'Empréstimo a Terceiros'],
  ['juridico', 'Processo Jurídico'],
  ['bloqueio', 'Bloqueio'],
]

const STATUS_OPTS: Array<[Passivo['status'], string]> = [
  ['pendente', 'Pendente'],
  ['em_negociacao', 'Em Negociação'],
  ['acordado', 'Acordado'],
  ['quitado', 'Quitado'],
]

export function PassivoModal({ open, onClose, editing }: Props) {
  const addItem = useData((s) => s.addPatrimonioItem)
  const updateItem = useData((s) => s.updatePatrimonioItem)
  const deleteItem = useData((s) => s.deletePatrimonioItem)
  const pessoasRaw = useData((s) => s.data?.pessoas)
  const pessoas = useMemo(() => pessoasRaw ?? [], [pessoasRaw])
  const isEdit = !!editing

  const [desc, setDesc] = useState('')
  const [tipo, setTipo] = useState('banco')
  const [credor, setCredor] = useState('')
  const [responsavel, setResponsavel] = useState(pessoas[0] ?? '')
  const [valorOriginal, setValorOriginal] = useState('')
  const [valorProposta, setValorProposta] = useState('')
  const [valorAcordado, setValorAcordado] = useState('')
  const [status, setStatus] = useState<Passivo['status']>('pendente')
  const [dataRef, setDataRef] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset state ao abrir / trocar editing (padrão React docs: ajustar state sem useEffect)
  const [prevOpenKey, setPrevOpenKey] = useState<string>('')
  const openKey = open ? (editing?.id ?? 'new') : ''
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setDesc(editing?.desc ?? '')
      setTipo((editing?.tipo as string) ?? 'banco')
      setCredor(editing?.credor ?? '')
      setResponsavel(editing?.responsavel ?? pessoas[0] ?? '')
      setValorOriginal(editing?.valorOriginal?.toString() ?? '')
      setValorProposta(editing?.valorProposta?.toString() ?? '')
      setValorAcordado(editing?.valorAcordado?.toString() ?? '')
      setStatus(editing?.status ?? 'pendente')
      setDataRef(editing?.dataRef ?? '')
      setNotes(editing?.notes ?? '')
      setError(null)
    }
  }

  function save() {
    const valOrig = parseFloat(valorOriginal.replace(',', '.'))
    if (!desc.trim() || !valOrig) { setError('Preencha descrição e valor original'); return }
    const payload: Partial<Passivo> = {
      desc: desc.trim(),
      tipo,
      credor: credor.trim(),
      responsavel,
      valorOriginal: valOrig,
      valorProposta: parseFloat(valorProposta.replace(',', '.')) || null,
      valorAcordado: parseFloat(valorAcordado.replace(',', '.')) || null,
      status,
      dataRef: dataRef || null,
      notes: notes.trim(),
    }
    if (isEdit && editing) updateItem<Passivo>('passivos', editing.id, payload)
    else addItem<Passivo>('passivos', payload as Passivo)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Remover este passivo?')) return
    deleteItem('passivos', editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar passivo' : 'Novo passivo'}
      size="lg"
      footer={
        <>
          {isEdit && (
            <Button variant="ghost" onClick={remove} className="mr-auto text-red hover:text-red">Excluir</Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>{isEdit ? 'Salvar' : 'Criar'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Cartão XP atrasado, Dívida Banco Itaú" />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Responsável">
          <Select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            {pessoas.length === 0 && <option value="">—</option>}
            {pessoas.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Credor" className="sm:col-span-2">
          <Input value={credor} onChange={(e) => setCredor(e.target.value)} placeholder="Nome do banco, pessoa ou empresa" />
        </Field>
        <Field label="Valor Original (R$)">
          <Input type="number" step="0.01" inputMode="decimal" value={valorOriginal} onChange={(e) => setValorOriginal(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Proposta do Credor (R$)">
          <Input type="number" step="0.01" inputMode="decimal" value={valorProposta} onChange={(e) => setValorProposta(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Valor Acordado (R$)">
          <Input type="number" step="0.01" inputMode="decimal" value={valorAcordado} onChange={(e) => setValorAcordado(e.target.value)} placeholder="Apenas se acordo fechado" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Passivo['status'])}>
            {STATUS_OPTS.map(([v, l]) => <option key={v as string} value={v as string}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Data de Referência" className="sm:col-span-2">
          <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Número do processo, contrato, etc." />
        </Field>
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  )
}
