import { useEffect, useState } from 'react'
import { CATEGORIES, type Despesa, type Receita, type UnifiedLancamento } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  /** se vier, é edição. Se undefined, é novo. */
  editing?: UnifiedLancamento | null
  /** quando criando novo, pré-seleciona despesa ou receita (esconde tabs) */
  defaultKind?: 'receita' | 'despesa'
}

const expenseCats = Object.entries(CATEGORIES).filter(([k]) => k !== 'receita')

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function LancamentoModal({ open, onClose, editing, defaultKind }: Props) {
  const data = useData((s) => s.data)
  const addDespesa = useData((s) => s.addDespesa)
  const updateDespesa = useData((s) => s.updateDespesa)
  const deleteDespesa = useData((s) => s.deleteDespesa)
  const addReceita = useData((s) => s.addReceita)
  const updateReceita = useData((s) => s.updateReceita)
  const deleteReceita = useData((s) => s.deleteReceita)

  const pessoas = (data?.pessoas as string[] | undefined) ?? ['Você']
  const contas = data?.contas ?? []

  const isEdit = !!editing
  const [kind, setKind] = useState<'despesa' | 'receita'>(editing?.kind ?? defaultKind ?? 'despesa')
  const [desc, setDesc] = useState(editing?.desc ?? '')
  const [amount, setAmount] = useState<string>(editing?.amount?.toString() ?? '')
  const [date, setDate] = useState(editing?.date ?? todayISO())
  const [person, setPerson] = useState(editing?.person ?? pessoas[0] ?? 'Você')
  const [category, setCategory] = useState(editing?.category ?? (editing?.kind === 'receita' ? 'receita' : 'alimentacao'))
  const [contaId, setContaId] = useState(editing?.contaId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset ao reabrir
  useEffect(() => {
    if (!open) return
    setKind(editing?.kind ?? defaultKind ?? 'despesa')
    setDesc(editing?.desc ?? '')
    setAmount(editing?.amount?.toString() ?? '')
    setDate(editing?.date ?? todayISO())
    setPerson(editing?.person ?? pessoas[0] ?? 'Você')
    setCategory(editing?.category ?? (editing?.kind === 'receita' ? 'receita' : 'alimentacao'))
    setContaId(editing?.contaId ?? '')
    setError(null)
    setSubmitting(false)
  }, [open, editing, defaultKind, pessoas])

  // Se mudar o tipo num NOVO lançamento, ajusta categoria default
  useEffect(() => {
    if (isEdit || !open) return
    setCategory(kind === 'receita' ? 'receita' : 'alimentacao')
  }, [kind, open, isEdit])

  function save() {
    const v = parseFloat(amount.replace(',', '.'))
    if (!desc.trim() || !date || !Number.isFinite(v) || v <= 0) {
      setError('Preencha descrição, valor (> 0) e data.')
      return
    }
    setSubmitting(true)
    const baseRec: Partial<Receita> = {
      desc: desc.trim(), amount: v, date, person,
      category: 'receita',
      contaId: contaId || null,
    }
    const baseDesp: Partial<Despesa> = {
      desc: desc.trim(), amount: v, date, person,
      category, sub: null,
      contaId: contaId || null,
    }

    if (isEdit && editing) {
      if (editing.kind === 'despesa') updateDespesa(editing.id, baseDesp)
      else updateReceita(editing.id, baseRec)
    } else if (kind === 'receita') {
      addReceita(baseRec as Receita)
    } else {
      addDespesa(baseDesp as Despesa)
    }
    onClose()
  }

  function remove() {
    if (!editing) return
    const ok = confirm('Excluir este lançamento? A ação não pode ser desfeita.')
    if (!ok) return
    if (editing.kind === 'despesa') deleteDespesa(editing.id)
    else deleteReceita(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? `Editar ${editing?.kind === 'receita' ? 'receita' : 'despesa'}`
          : defaultKind === 'receita'
            ? 'Nova receita'
            : defaultKind === 'despesa'
              ? 'Nova despesa'
              : 'Novo lançamento'
      }
      size="md"
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
      {!isEdit && !defaultKind && (
        <div className="mb-4 inline-flex rounded-lg border border-line-2 bg-elevated p-0.5">
          <button
            type="button"
            onClick={() => setKind('despesa')}
            className={
              'rounded-md px-4 py-1.5 text-xs font-bold transition-colors ' +
              (kind === 'despesa' ? 'bg-red/15 text-red' : 'text-mist hover:text-ink')
            }
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setKind('receita')}
            className={
              'rounded-md px-4 py-1.5 text-xs font-bold transition-colors ' +
              (kind === 'receita' ? 'bg-green/15 text-green' : 'text-mist hover:text-ink')
            }
          >
            Receita
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Supermercado, Salário…" autoFocus />
        </Field>

        <Field label="Valor (R$)">
          <Input
            type="number" step="0.01" inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </Field>

        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Pessoa">
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            {pessoas.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>

        {kind === 'despesa' && (
          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {expenseCats.map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </Field>
        )}

        {contas.length > 0 && (
          <Field label="Conta (opcional)" className={kind === 'receita' ? 'sm:col-span-2' : ''}>
            <Select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">— Nenhuma —</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
