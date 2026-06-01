import { useEffect, useMemo, useState } from 'react'
import type { Ativo } from '@haile/shared'
import { ATIVO_CATEGORIAS, ATIVO_SUBCATEGORIAS, MOEDAS, RESERVA_TIPOS, IMPOSTO_OPTS } from '@haile/shared'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Ativo | null
  /** Pré-seleciona o modo (reserva ou cripto/FIAT). Para "Adicionar" sempre. */
  defaultKind?: 'reserva' | 'cripto_fiat'
}

const today = () => new Date().toISOString().slice(0, 10)

type Kind = 'reserva' | 'cripto_fiat'

function detectKind(a: Ativo | null | undefined): Kind {
  if (!a) return 'reserva'
  if (a.platform != null || a.qty != null || a.unitPrice != null) return 'cripto_fiat'
  if (a.valorInvestido != null || a.rendimento != null || a.nome != null) return 'reserva'
  return 'reserva'
}

export function AtivoModal({ open, onClose, editing, defaultKind = 'reserva' }: Props) {
  const addItem = useData((s) => s.addPatrimonioItem)
  const updateItem = useData((s) => s.updatePatrimonioItem)
  const deleteItem = useData((s) => s.deletePatrimonioItem)
  const isEdit = !!editing

  const [kind, setKind] = useState<Kind>(defaultKind)

  // Reserva fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState(RESERVA_TIPOS[0])
  const [valorInvestido, setValorInvestido] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [rendimento, setRendimento] = useState('')
  const [imposto, setImposto] = useState('0')
  const [carencia, setCarencia] = useState('')

  // Crypto/FIAT fields
  const [platform, setPlatform] = useState('')
  const [categoria, setCategoria] = useState(ATIVO_CATEGORIAS[0].id)
  const [sub, setSub] = useState('')
  const [typeField, setTypeField] = useState('Crypto')
  const [currency, setCurrency] = useState('BRL')
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('0')
  const [updated, setUpdated] = useState(today())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const k = isEdit ? detectKind(editing) : defaultKind
    setKind(k)
    // Reserva
    setNome(editing?.nome ?? '')
    setTipo(editing?.tipo ?? RESERVA_TIPOS[0])
    setValorInvestido(editing?.valorInvestido?.toString() ?? '')
    setValorAtual(editing?.valorAtual?.toString() ?? '')
    setRendimento(editing?.rendimento?.toString() ?? '')
    setImposto((editing?.imposto ?? 0).toString())
    setCarencia(editing?.carencia ?? '')
    // Crypto/FIAT
    setPlatform(editing?.platform ?? '')
    setCategoria(editing?.categoria ?? ATIVO_CATEGORIAS[0].id)
    setSub(editing?.sub ?? '')
    setTypeField(editing?.type ?? 'Crypto')
    setCurrency(editing?.currency ?? 'BRL')
    setQty((editing?.qty ?? 1).toString())
    setUnitPrice((editing?.unitPrice ?? 0).toString())
    setUpdated(editing?.updated ?? today())
    setError(null)
  }, [open, editing, defaultKind, isEdit])

  const catInfo = useMemo(() => ATIVO_CATEGORIAS.find((c) => c.id === categoria) ?? null, [categoria])
  const subOptions = ATIVO_SUBCATEGORIAS[categoria] ?? []

  function save() {
    if (kind === 'reserva') {
      if (!nome.trim()) { setError('Informe o nome'); return }
      const inv = parseFloat(valorInvestido.replace(',', '.')) || 0
      const atual = parseFloat(valorAtual.replace(',', '.')) || inv
      const payload: Partial<Ativo> = {
        kind: 'reserva',
        nome: nome.trim(),
        tipo,
        valorInvestido: inv,
        valorAtual: atual,
        rendimento: parseFloat(rendimento.replace(',', '.')) || 0,
        imposto: parseFloat(imposto.replace(',', '.')) || 0,
        carencia: carencia || undefined,
      }
      if (isEdit && editing) updateItem<Ativo>('ativos', editing.id, payload)
      else addItem<Ativo>('ativos', payload as Ativo)
    } else {
      if (!platform.trim()) { setError('Preencha o nome/plataforma'); return }
      const payload: Partial<Ativo> = {
        kind: currency === 'BRL' ? 'fiat' : 'cripto',
        platform: platform.trim(),
        categoria,
        sub,
        type: typeField,
        currency,
        qty: parseFloat(qty.replace(',', '.')) || 0,
        unitPrice: parseFloat(unitPrice.replace(',', '.')) || 0,
        updated,
      }
      if (isEdit && editing) updateItem<Ativo>('ativos', editing.id, payload)
      else addItem<Ativo>('ativos', payload as Ativo)
    }
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Remover este ativo?')) return
    deleteItem('ativos', editing.id)
    onClose()
  }

  const title = (() => {
    if (isEdit) return 'Editar ativo'
    return kind === 'reserva' ? 'Novo investimento' : 'Novo ativo (cripto / FIAT)'
  })()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
      {!isEdit && (
        <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setKind('reserva')}
            className={
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' +
              (kind === 'reserva' ? 'bg-elevated text-ink' : 'text-mist hover:text-ink')
            }
          >
            Investimento / Reserva
          </button>
          <button
            type="button"
            onClick={() => setKind('cripto_fiat')}
            className={
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' +
              (kind === 'cripto_fiat' ? 'bg-elevated text-ink' : 'text-mist hover:text-ink')
            }
          >
            Cripto / FIAT
          </button>
        </div>
      )}

      {kind === 'reserva' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome / Descrição" className="sm:col-span-2">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: CDB Nubank 110% CDI" />
          </Field>
          <Field label="Tipo de Produto" className="sm:col-span-2">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {RESERVA_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Valor Investido (R$)">
            <Input type="number" step="100" inputMode="decimal" value={valorInvestido} onChange={(e) => setValorInvestido(e.target.value)} />
          </Field>
          <Field label="Valor Atual (R$)">
            <Input type="number" step="100" inputMode="decimal" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="Default = investido" />
          </Field>
          <Field label="Rendimento (% a.a.)">
            <Input type="number" step="0.1" inputMode="decimal" value={rendimento} onChange={(e) => setRendimento(e.target.value)} placeholder="Ex: 12.5" />
          </Field>
          <Field label="Imposto de Renda">
            <Select value={imposto} onChange={(e) => setImposto(e.target.value)}>
              {IMPOSTO_OPTS.map((o) => <option key={o.val} value={o.val.toString()}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Carência (data)" className="sm:col-span-2">
            <Input type="date" value={carencia} onChange={(e) => setCarencia(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome / Plataforma" className="sm:col-span-2">
            <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Ex: Bitcoin, Wise" />
          </Field>
          <Field label="Categoria de investimento" className="sm:col-span-2">
            <Select value={categoria} onChange={(e) => { setCategoria(e.target.value); setSub('') }}>
              {ATIVO_CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
            {catInfo && (
              <p className="mt-1 text-[11px] text-mist">{catInfo.desc}</p>
            )}
          </Field>
          <Field label="Subcategoria" className="sm:col-span-2">
            <Select value={sub} onChange={(e) => setSub(e.target.value)}>
              <option value="">—</option>
              {subOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={typeField} onChange={(e) => setTypeField(e.target.value)}>
              {['Crypto', 'Token', 'FIAT BR', 'FIAT EUR'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Moeda">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {MOEDAS.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.label}</option>)}
            </Select>
          </Field>
          <Field label="Quantidade">
            <Input type="number" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Preço unitário">
            <Input type="number" step="any" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </Field>
          <Field label="Data atualização" className="sm:col-span-2">
            <Input type="date" value={updated} onChange={(e) => setUpdated(e.target.value)} />
          </Field>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </Modal>
  )
}
