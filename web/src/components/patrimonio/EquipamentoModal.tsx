import { useEffect, useState } from 'react'
import type { Equipamento } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Equipamento | null
}

const CATS: Array<[Equipamento['categoria'], string]> = [
  ['eletronico', 'Eletrônico'],
  ['eletrodomestico', 'Eletrodoméstico'],
  ['moveis', 'Móveis'],
  ['ferramenta', 'Ferramenta'],
  ['outro', 'Outro'],
]

const today = () => new Date().toISOString().slice(0, 10)

export function EquipamentoModal({ open, onClose, editing }: Props) {
  const addItem = useData((s) => s.addPatrimonioItem)
  const updateItem = useData((s) => s.updatePatrimonioItem)
  const deleteItem = useData((s) => s.deletePatrimonioItem)
  const isEdit = !!editing

  const [categoria, setCategoria] = useState<string>('eletronico')
  const [nome, setNome] = useState('')
  const [valorCompra, setValorCompra] = useState('')
  const [dataCompra, setDataCompra] = useState(today())
  const [valorAtual, setValorAtual] = useState('')
  const [depreciacaoAnualPct, setDepreciacao] = useState('20')
  const [vidaUtilAnos, setVidaUtil] = useState('5')
  const [custoManutencaoMensal, setManut] = useState('')
  const [custoAnualExtra, setAnualExtra] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCategoria((editing?.categoria as string) ?? 'eletronico')
    setNome(editing?.nome ?? '')
    setValorCompra(editing?.valorCompra?.toString() ?? '')
    setDataCompra(editing?.dataCompra ?? today())
    setValorAtual(editing?.valorAtual?.toString() ?? '')
    setDepreciacao((editing?.depreciacaoAnualPct ?? 20).toString())
    setVidaUtil((editing?.vidaUtilAnos ?? 5).toString())
    setManut(editing?.custoManutencaoMensal?.toString() ?? '')
    setAnualExtra(editing?.custoAnualExtra?.toString() ?? '')
    setNotes(editing?.notes ?? '')
    setError(null)
  }, [open, editing])

  function save() {
    if (!nome.trim()) { setError('Informe o nome do equipamento'); return }
    const vc = parseFloat(valorCompra.replace(',', '.'))
    if (!vc) { setError('Informe o valor de compra'); return }
    const payload: Partial<Equipamento> = {
      categoria, nome: nome.trim(),
      valorCompra: vc,
      dataCompra,
      valorAtual: parseFloat(valorAtual.replace(',', '.')) || 0,
      depreciacaoAnualPct: parseFloat(depreciacaoAnualPct.replace(',', '.')) || 20,
      vidaUtilAnos: parseInt(vidaUtilAnos, 10) || 5,
      custoManutencaoMensal: parseFloat(custoManutencaoMensal.replace(',', '.')) || 0,
      custoAnualExtra: parseFloat(custoAnualExtra.replace(',', '.')) || 0,
      notes: notes.trim(),
    }
    if (isEdit && editing) updateItem<Equipamento>('equipamentos', editing.id, payload)
    else addItem<Equipamento>('equipamentos', payload as Equipamento)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Remover este equipamento?')) return
    deleteItem('equipamentos', editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar equipamento' : 'Novo equipamento'}
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
        <Field label="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATS.map(([v, l]) => <option key={v as string} value={v as string}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Nome / modelo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: MacBook Pro 14" />
        </Field>
        <Field label="Valor de compra (R$)">
          <Input type="number" step="50" inputMode="decimal" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} />
        </Field>
        <Field label="Data da compra">
          <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
        </Field>
        <Field label="Valor atual (R$) — opcional" hint="Calcula auto se vazio">
          <Input type="number" step="50" inputMode="decimal" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
        </Field>
        <Field label="Depreciação anual (%)">
          <Input type="number" step="1" min={0} max={60} value={depreciacaoAnualPct} onChange={(e) => setDepreciacao(e.target.value)} />
        </Field>
        <Field label="Vida útil (anos)">
          <Input type="number" step="1" min={1} max={30} value={vidaUtilAnos} onChange={(e) => setVidaUtil(e.target.value)} />
        </Field>
        <Field label="Manutenção/mês (R$)">
          <Input type="number" step="10" inputMode="decimal" value={custoManutencaoMensal} onChange={(e) => setManut(e.target.value)} placeholder="Limpeza, peças, software" />
        </Field>
        <Field label="Custo anual extra (R$)">
          <Input type="number" step="50" inputMode="decimal" value={custoAnualExtra} onChange={(e) => setAnualExtra(e.target.value)} placeholder="Seguro, garantia" />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <p className="mt-3 text-[11px] text-faint">
        Sugestão de depreciação: eletrônicos 25-35%/a.a., eletrodomésticos 15-20%/a.a., móveis 10%/a.a., ferramentas 10-15%/a.a.
      </p>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  )
}
