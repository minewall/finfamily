import { useState } from 'react'
import type { Tributo, TributoTipo } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Tributo | null
  defaultTipo?: TributoTipo
}

const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function TributoModal({ open, onClose, editing, defaultTipo }: Props) {
  const data = useData((s) => s.data)
  const addTributo = useData((s) => s.addTributo)
  const updateTributo = useData((s) => s.updateTributo)
  const deleteTributo = useData((s) => s.deleteTributo)

  const pessoas = (data?.pessoas as string[] | undefined) ?? ['Você']
  const pessoasOpcoes = [...new Set([...pessoas, 'Família'])]

  const isEdit = !!editing
  const anoAtual = new Date().getFullYear()

  const [tipo, setTipo] = useState<TributoTipo>(editing?.tipo ?? defaultTipo ?? 'iptu')
  const [ano, setAno] = useState<string>(editing?.ano?.toString() ?? anoAtual.toString())
  const [label, setLabel] = useState<string>(editing?.label ?? '')
  const [valor, setValor] = useState<string>(editing?.valor?.toString() ?? '')
  const [parcelas, setParcelas] = useState<string>(editing?.parcelas?.toString() ?? '1')
  const [pagas, setPagas] = useState<string>(editing?.pagas?.toString() ?? '0')
  const [vencimentoMes, setVencimentoMes] = useState<string>(
    editing?.vencimentoMes?.toString() ?? '1',
  )
  const [vencimentoDia, setVencimentoDia] = useState<string>(
    editing?.vencimentoDia?.toString() ?? '10',
  )
  const [pessoa, setPessoa] = useState<string>(editing?.pessoa ?? '')
  // IRPF
  const [status, setStatus] = useState<string>(editing?.status ?? 'rascunho')
  const [aReceber, setAReceber] = useState<string>(editing?.aReceber?.toString() ?? '')
  const [aPagar, setAPagar] = useState<string>(editing?.aPagar?.toString() ?? '')
  // IPVA
  const [placa, setPlaca] = useState<string>(editing?.placa ?? '')

  const [error, setError] = useState<string | null>(null)

  // Reset state ao abrir / trocar editing (padrão React docs: ajustar state sem useEffect)
  const [prevOpenKey, setPrevOpenKey] = useState<string>('')
  const openKey = open ? (editing?.id ?? `new:${defaultTipo ?? 'iptu'}`) : ''
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setTipo(editing?.tipo ?? defaultTipo ?? 'iptu')
      setAno(editing?.ano?.toString() ?? anoAtual.toString())
      setLabel(editing?.label ?? '')
      setValor(editing?.valor?.toString() ?? '')
      setParcelas(editing?.parcelas?.toString() ?? '1')
      setPagas(editing?.pagas?.toString() ?? '0')
      setVencimentoMes(editing?.vencimentoMes?.toString() ?? '1')
      setVencimentoDia(editing?.vencimentoDia?.toString() ?? '10')
      setPessoa(editing?.pessoa ?? '')
      setStatus(editing?.status ?? 'rascunho')
      setAReceber(editing?.aReceber?.toString() ?? '')
      setAPagar(editing?.aPagar?.toString() ?? '')
      setPlaca(editing?.placa ?? '')
      setError(null)
    }
  }

  function save() {
    if (!label.trim()) { setError('Informe a descrição.'); return }
    const valorN = parseFloat((valor || '').replace(',', '.')) || 0
    const parcelasN = parseInt(parcelas, 10) || 1
    const pagasN = Math.max(0, Math.min(parcelasN, parseInt(pagas, 10) || 0))
    const vencMes = Math.max(1, Math.min(12, parseInt(vencimentoMes, 10) || 1))
    const vencDia = Math.max(1, Math.min(31, parseInt(vencimentoDia, 10) || 10))
    const anoN = parseInt(ano, 10) || anoAtual

    const payload: Partial<Tributo> = {
      tipo,
      label: label.trim(),
      valor: valorN,
      parcelas: parcelasN,
      pagas: pagasN,
      vencimentoMes: vencMes,
      vencimentoDia: vencDia,
      ano: anoN,
      pessoa: pessoa || null,
    }
    if (tipo === 'irpf') {
      payload.status = status
      payload.aReceber = parseFloat((aReceber || '').replace(',', '.')) || 0
      payload.aPagar = parseFloat((aPagar || '').replace(',', '.')) || 0
      if (payload.aPagar && payload.aPagar > 0 && !editing?.totalParcelas) {
        payload.totalParcelas = parcelasN
      }
    }
    if (tipo === 'ipva') {
      payload.placa = (placa || '').toUpperCase().trim() || undefined
    }

    if (isEdit && editing) {
      updateTributo(editing.id, payload)
    } else {
      addTributo(payload as Tributo)
    }
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Excluir este tributo? A ação não pode ser desfeita.')) return
    deleteTributo(editing.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar tributo' : 'Novo tributo'}
      size="lg"
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
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TributoTipo)}>
            <option value="irpf">IRPF (Declaração)</option>
            <option value="iptu">IPTU (Imóvel)</option>
            <option value="ipva">IPVA (Veículo)</option>
            <option value="outros">Outros (Taxa, contribuição)</option>
          </Select>
        </Field>

        <Field label="Ano">
          <Input
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
          />
        </Field>

        <Field label="Descrição" className="sm:col-span-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Casa Vila Madalena, Volvo XC60…"
            autoFocus
          />
        </Field>

        <Field label="Valor (R$)">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </Field>

        <Field label="Parcelas">
          <Input
            type="number"
            min="1"
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
          />
        </Field>

        <Field label="Parcelas pagas">
          <Input
            type="number"
            min="0"
            value={pagas}
            onChange={(e) => setPagas(e.target.value)}
          />
        </Field>

        <Field label="Responsável">
          <Select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
            <option value="">—</option>
            {pessoasOpcoes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </Field>

        <Field label="Mês 1ª parcela">
          <Select value={vencimentoMes} onChange={(e) => setVencimentoMes(e.target.value)}>
            {MESES_FULL.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
        </Field>

        <Field label="Dia do vencimento">
          <Input
            type="number"
            min="1"
            max="31"
            value={vencimentoDia}
            onChange={(e) => setVencimentoDia(e.target.value)}
          />
        </Field>

        {tipo === 'irpf' && (
          <>
            <Field label="Status da declaração" className="sm:col-span-2">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="rascunho">Em rascunho</option>
                <option value="declarada">Declarada</option>
                <option value="pendente">Pendente</option>
              </Select>
            </Field>
            <Field label="A receber (R$)">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={aReceber}
                onChange={(e) => setAReceber(e.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="A pagar parcelado (R$)">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={aPagar}
                onChange={(e) => setAPagar(e.target.value)}
                placeholder="0,00"
              />
            </Field>
          </>
        )}

        {tipo === 'ipva' && (
          <Field label="Placa">
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1A23"
              maxLength={8}
            />
          </Field>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
