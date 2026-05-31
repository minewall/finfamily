import { useEffect, useState } from 'react'
import type { Meta } from '@haile/shared'
import { META_TIPOS, type MetaTipo } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Meta | null
}

export function MetaModal({ open, onClose, editing }: Props) {
  const addMeta = useData((s) => s.addMeta)
  const updateMeta = useData((s) => s.updateMeta)
  const deleteMeta = useData((s) => s.deleteMeta)

  const isEdit = !!editing
  const [label, setLabel] = useState(editing?.label ?? '')
  const [type, setType] = useState<MetaTipo>((editing?.type as MetaTipo) ?? 'objetivo')
  const [target, setTarget] = useState<string>(editing?.target?.toString() ?? '')
  const [current, setCurrent] = useState<string>(editing?.current?.toString() ?? '0')
  const [deadline, setDeadline] = useState<string>((editing?.deadline as string) ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLabel(editing?.label ?? '')
    setType((editing?.type as MetaTipo) ?? 'objetivo')
    setTarget(editing?.target?.toString() ?? '')
    setCurrent(editing?.current?.toString() ?? '0')
    setDeadline((editing?.deadline as string) ?? '')
    setError(null)
  }, [open, editing])

  const showCurrent = type === 'objetivo' || type === 'reserva'
  const showDeadline = type === 'objetivo'

  function save() {
    const t = parseFloat(target.replace(',', '.'))
    if (!label.trim()) { setError('Informe o nome da meta.'); return }
    if (!Number.isFinite(t) || t <= 0) { setError('Defina um valor-alvo > 0.'); return }
    const payload: Partial<Meta> = {
      label: label.trim(),
      type,
      target: t,
      active: true,
    }
    if (showCurrent) payload.current = parseFloat(current.replace(',', '.')) || 0
    if (showDeadline && deadline) payload.deadline = deadline

    if (isEdit && editing) updateMeta(editing.id, payload)
    else addMeta(payload as Meta)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Excluir esta meta? A ação não pode ser desfeita.')) return
    deleteMeta(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar meta' : 'Nova meta'}
      size="md"
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
        <Field label="Nome" className="sm:col-span-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Viagem Disney, Reserva de emergência…" autoFocus />
        </Field>
        <Field label="Tipo" className="sm:col-span-2" hint={META_TIPOS.find((t) => t.id === type)?.desc}>
          <Select value={type} onChange={(e) => setType(e.target.value as MetaTipo)}>
            {META_TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label={type === 'limite_desp' ? 'Teto (R$)' : type === 'min_receita' ? 'Receita mínima (R$)' : 'Valor-alvo (R$)'}>
          <Input type="number" step="0.01" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" />
        </Field>
        {showCurrent && (
          <Field label="Valor atual (R$)">
            <Input type="number" step="0.01" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0,00" />
          </Field>
        )}
        {showDeadline && (
          <Field label="Prazo (opcional)" className="sm:col-span-2">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
