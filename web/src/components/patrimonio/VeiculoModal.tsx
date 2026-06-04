import { useState } from 'react'
import type { Veiculo } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Veiculo | null
}

const today = () => new Date().toISOString().slice(0, 10)

export function VeiculoModal({ open, onClose, editing }: Props) {
  const addItem = useData((s) => s.addPatrimonioItem)
  const updateItem = useData((s) => s.updatePatrimonioItem)
  const deleteItem = useData((s) => s.deletePatrimonioItem)
  const isEdit = !!editing

  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [apelido, setApelido] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [placa, setPlaca] = useState('')
  const [cor, setCor] = useState('')
  const [valorCompra, setValorCompra] = useState('')
  const [dataCompra, setDataCompra] = useState(today())
  const [valorAtual, setValorAtual] = useState('')
  const [depreciacaoAnualPct, setDeprec] = useState('10')
  const [ipvaAnual, setIpva] = useState('')
  const [seguroAnual, setSeguro] = useState('')
  const [manutencaoMensal, setManut] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset state ao abrir / trocar editing (padrão React docs: ajustar state sem useEffect)
  const [prevOpenKey, setPrevOpenKey] = useState<string>('')
  const openKey = open ? (editing?.id ?? 'new') : ''
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setMarca(editing?.marca ?? '')
      setModelo(editing?.modelo ?? '')
      setApelido(editing?.apelido ?? '')
      setAno((editing?.ano ?? new Date().getFullYear()).toString())
      setPlaca(editing?.placa ?? '')
      setCor(editing?.cor ?? '')
      setValorCompra(editing?.valorCompra?.toString() ?? '')
      setDataCompra(editing?.dataCompra ?? today())
      setValorAtual(editing?.valorAtual?.toString() ?? '')
      setDeprec((editing?.depreciacaoAnualPct ?? 10).toString())
      setIpva(editing?.ipvaAnual?.toString() ?? '')
      setSeguro(editing?.seguroAnual?.toString() ?? '')
      setManut(editing?.manutencaoMensal?.toString() ?? '')
      setNotes(editing?.notes ?? '')
      setError(null)
    }
  }

  function save() {
    if (!marca.trim() || !modelo.trim()) { setError('Preencha marca e modelo'); return }
    const vc = parseFloat(valorCompra.replace(',', '.'))
    if (!vc) { setError('Informe o valor de compra'); return }
    const payload: Partial<Veiculo> = {
      marca: marca.trim(), modelo: modelo.trim(), apelido: apelido.trim(),
      ano: parseInt(ano, 10) || null,
      placa: placa.trim(), cor: cor.trim(),
      valorCompra: vc, dataCompra,
      valorAtual: parseFloat(valorAtual.replace(',', '.')) || 0,
      depreciacaoAnualPct: parseFloat(depreciacaoAnualPct.replace(',', '.')) || 10,
      ipvaAnual: parseFloat(ipvaAnual.replace(',', '.')) || 0,
      seguroAnual: parseFloat(seguroAnual.replace(',', '.')) || 0,
      manutencaoMensal: parseFloat(manutencaoMensal.replace(',', '.')) || 0,
      notes: notes.trim(),
    }
    if (isEdit && editing) updateItem<Veiculo>('veiculos', editing.id, payload)
    else addItem<Veiculo>('veiculos', payload as Veiculo)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Remover este veículo?')) return
    deleteItem('veiculos', editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar veículo' : 'Novo veículo'}
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
        <Field label="Marca"><Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Toyota" /></Field>
        <Field label="Modelo"><Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Corolla XEi" /></Field>
        <Field label="Apelido (opcional)"><Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Carro da Mari" /></Field>
        <Field label="Ano"><Input type="number" min={1980} max={new Date().getFullYear() + 1} value={ano} onChange={(e) => setAno(e.target.value)} /></Field>
        <Field label="Placa (opcional)"><Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-1D23" /></Field>
        <Field label="Cor (opcional)"><Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Branca" /></Field>
        <Field label="Valor de compra (R$)">
          <Input type="number" step="100" inputMode="decimal" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} />
        </Field>
        <Field label="Data da compra">
          <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
        </Field>
        <Field label="Valor atual (R$) — opcional" hint="Calcula auto se vazio">
          <Input type="number" step="100" inputMode="decimal" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
        </Field>
        <Field label="Depreciação anual (%)">
          <Input type="number" step="0.5" min={0} max={50} value={depreciacaoAnualPct} onChange={(e) => setDeprec(e.target.value)} />
        </Field>
        <Field label="IPVA anual (R$)">
          <Input type="number" step="50" inputMode="decimal" value={ipvaAnual} onChange={(e) => setIpva(e.target.value)} />
        </Field>
        <Field label="Seguro anual (R$)">
          <Input type="number" step="50" inputMode="decimal" value={seguroAnual} onChange={(e) => setSeguro(e.target.value)} />
        </Field>
        <Field label="Manutenção mensal estimada (R$)" className="sm:col-span-2">
          <Input type="number" step="50" inputMode="decimal" value={manutencaoMensal} onChange={(e) => setManut(e.target.value)} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  )
}
