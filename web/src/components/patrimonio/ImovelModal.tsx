import { useEffect, useState } from 'react'
import type { Imovel } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Imovel | null
}

const TIPOS: Array<[string, string]> = [
  ['casa', 'Casa'],
  ['apartamento', 'Apartamento'],
  ['sala', 'Sala comercial'],
  ['terreno', 'Terreno'],
  ['outro', 'Outro'],
]

const today = () => new Date().toISOString().slice(0, 10)

export function ImovelModal({ open, onClose, editing }: Props) {
  const addItem = useData((s) => s.addPatrimonioItem)
  const updateItem = useData((s) => s.updatePatrimonioItem)
  const deleteItem = useData((s) => s.deletePatrimonioItem)
  const isEdit = !!editing

  const [tipo, setTipo] = useState('casa')
  const [apelido, setApelido] = useState('')
  const [endereco, setEndereco] = useState('')
  const [valorCompra, setValorCompra] = useState('')
  const [dataCompra, setDataCompra] = useState(today())
  const [valorAtual, setValorAtual] = useState('')
  const [valorizacaoAnualPct, setValoriz] = useState('0')
  const [financiado, setFinanciado] = useState(false)
  const [saldoDevedor, setSaldoDevedor] = useState('')
  const [parcelaFinanciamento, setParcela] = useState('')
  const [iptuAnual, setIptu] = useState('')
  const [condominioMensal, setCondominio] = useState('')
  const [manutencaoMensal, setManut] = useState('')
  const [alugado, setAlugado] = useState(false)
  const [aluguelMensal, setAluguel] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTipo((editing?.tipo as string) ?? 'casa')
    setApelido(editing?.apelido ?? '')
    setEndereco(editing?.endereco ?? '')
    setValorCompra(editing?.valorCompra?.toString() ?? '')
    setDataCompra(editing?.dataCompra ?? today())
    setValorAtual(editing?.valorAtual?.toString() ?? '')
    setValoriz((editing?.valorizacaoAnualPct ?? 0).toString())
    setFinanciado(!!editing?.financiado)
    setSaldoDevedor(editing?.saldoDevedor?.toString() ?? '')
    setParcela(editing?.parcelaFinanciamento?.toString() ?? '')
    setIptu(editing?.iptuAnual?.toString() ?? '')
    setCondominio(editing?.condominioMensal?.toString() ?? '')
    setManut(editing?.manutencaoMensal?.toString() ?? '')
    setAlugado(!!editing?.alugado)
    setAluguel(editing?.aluguelMensal?.toString() ?? '')
    setNotes(editing?.notes ?? '')
    setError(null)
  }, [open, editing])

  function save() {
    if (!apelido.trim() && !endereco.trim()) { setError('Informe um apelido ou endereço'); return }
    const vc = parseFloat(valorCompra.replace(',', '.'))
    if (!vc) { setError('Informe o valor de compra'); return }
    const payload: Partial<Imovel> = {
      tipo, apelido: apelido.trim(), endereco: endereco.trim(),
      valorCompra: vc, dataCompra,
      valorAtual: parseFloat(valorAtual.replace(',', '.')) || 0,
      valorizacaoAnualPct: parseFloat(valorizacaoAnualPct.replace(',', '.')) || 0,
      financiado,
      saldoDevedor: parseFloat(saldoDevedor.replace(',', '.')) || 0,
      parcelaFinanciamento: parseFloat(parcelaFinanciamento.replace(',', '.')) || 0,
      iptuAnual: parseFloat(iptuAnual.replace(',', '.')) || 0,
      condominioMensal: parseFloat(condominioMensal.replace(',', '.')) || 0,
      manutencaoMensal: parseFloat(manutencaoMensal.replace(',', '.')) || 0,
      alugado,
      aluguelMensal: parseFloat(aluguelMensal.replace(',', '.')) || 0,
      notes: notes.trim(),
    }
    if (isEdit && editing) updateItem<Imovel>('imoveis', editing.id, payload)
    else addItem<Imovel>('imoveis', payload as Imovel)
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Remover este imóvel?')) return
    deleteItem('imoveis', editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar imóvel' : 'Novo imóvel'}
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
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Apelido">
          <Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Casa da família" />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade" />
        </Field>
        <Field label="Valor de compra (R$)">
          <Input type="number" step="1000" inputMode="decimal" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} />
        </Field>
        <Field label="Data da compra">
          <Input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
        </Field>
        <Field label="Valor atual (R$) — opcional" hint="Calcula auto se vazio">
          <Input type="number" step="1000" inputMode="decimal" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
        </Field>
        <Field label="Valorização anual (%)">
          <Input type="number" step="0.5" min={-10} max={20} value={valorizacaoAnualPct} onChange={(e) => setValoriz(e.target.value)} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={financiado} onChange={(e) => setFinanciado(e.target.checked)} className="h-4 w-4 accent-indigo" />
          <span className="text-sm text-ink">Imóvel financiado</span>
        </label>

        <Field label="Saldo devedor (R$)">
          <Input type="number" step="1000" inputMode="decimal" value={saldoDevedor} onChange={(e) => setSaldoDevedor(e.target.value)} disabled={!financiado} />
        </Field>
        <Field label="Parcela do financiamento (R$/mês)">
          <Input type="number" step="50" inputMode="decimal" value={parcelaFinanciamento} onChange={(e) => setParcela(e.target.value)} disabled={!financiado} />
        </Field>

        <Field label="IPTU anual (R$)">
          <Input type="number" step="50" inputMode="decimal" value={iptuAnual} onChange={(e) => setIptu(e.target.value)} />
        </Field>
        <Field label="Condomínio mensal (R$)">
          <Input type="number" step="10" inputMode="decimal" value={condominioMensal} onChange={(e) => setCondominio(e.target.value)} />
        </Field>
        <Field label="Manutenção mensal estimada (R$)" className="sm:col-span-2">
          <Input type="number" step="10" inputMode="decimal" value={manutencaoMensal} onChange={(e) => setManut(e.target.value)} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={alugado} onChange={(e) => setAlugado(e.target.checked)} className="h-4 w-4 accent-indigo" />
          <span className="text-sm text-ink">Imóvel alugado (recebo aluguel)</span>
        </label>
        <Field label="Aluguel mensal recebido (R$)" className="sm:col-span-2">
          <Input type="number" step="50" inputMode="decimal" value={aluguelMensal} onChange={(e) => setAluguel(e.target.value)} disabled={!alugado} />
        </Field>

        <Field label="Observações" className="sm:col-span-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  )
}
