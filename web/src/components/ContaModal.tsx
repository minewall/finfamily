import { useEffect, useState } from 'react'
import type { Conta } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Conta | null
}

const COLORS = ['#6b5ef5', '#2dcfc0', '#1dc97e', '#ffa930', '#ff70b8', '#4aa8ff', '#ff4a68']
const TIPOS = ['Corrente', 'Poupança', 'Investimento', 'Digital', 'Carteira', 'Outros']

export function ContaModal({ open, onClose, editing }: Props) {
  const addConta = useData((s) => s.addConta)
  const updateConta = useData((s) => s.updateConta)
  const deleteConta = useData((s) => s.deleteConta)

  const isEdit = !!editing
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [banco, setBanco] = useState(editing?.banco ?? '')
  const [tipo, setTipo] = useState(editing?.tipo ?? 'Corrente')
  const [categoria, setCategoria] = useState<'bancaria' | 'digital' | 'cripto'>(
    (editing?.categoria as 'bancaria' | 'digital' | 'cripto') ?? 'bancaria',
  )
  const [saldo, setSaldo] = useState<string>(editing?.saldo?.toString() ?? '0')
  const [cor, setCor] = useState(editing?.cor ?? COLORS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNome(editing?.nome ?? '')
    setBanco(editing?.banco ?? '')
    setTipo(editing?.tipo ?? 'Corrente')
    setCategoria((editing?.categoria as 'bancaria' | 'digital' | 'cripto') ?? 'bancaria')
    setSaldo(editing?.saldo?.toString() ?? '0')
    setCor(editing?.cor ?? COLORS[0])
    setError(null)
  }, [open, editing])

  function save() {
    const v = parseFloat(saldo.replace(',', '.'))
    if (!nome.trim()) { setError('Informe o nome da conta.'); return }
    if (!Number.isFinite(v)) { setError('Saldo inválido.'); return }
    const payload: Partial<Conta> = {
      nome: nome.trim(), banco: banco.trim(), tipo, categoria, saldo: v, cor,
    }
    if (isEdit && editing) updateConta(editing.id, payload)
    else addConta(payload as Conta)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Excluir esta conta? Os lançamentos vinculados a ela ficam órfãos (sem conta).')) return
    deleteConta(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar conta' : 'Nova conta'}
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
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Itaú Corrente" autoFocus />
        </Field>
        <Field label="Banco / Instituição">
          <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Itaú, Nubank…" />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)}>
            <option value="bancaria">Bancária</option>
            <option value="digital">Digital</option>
            <option value="cripto">Cripto</option>
          </Select>
        </Field>
        <Field label="Saldo (R$)">
          <Input type="number" step="0.01" inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
        </Field>
        <Field label="Cor" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={
                  'h-8 w-8 rounded-full border-2 transition-transform ' +
                  (cor === c ? 'border-ink scale-110' : 'border-transparent hover:scale-105')
                }
                style={{ background: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </Field>
      </div>
      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
