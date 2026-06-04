import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/useData'
import type { CartaoLike } from '@/lib/cartao-stats'
import { cartaoNome, cartaoLimite, cartaoCor, cartaoFechamento, cartaoVencimento } from '@/lib/cartao-stats'

interface Props {
  open: boolean
  onClose: () => void
  editing?: CartaoLike | null
}

// 6 cores predefinidas + custom (input hex). Inspiradas em paletas dos
// maiores bancos brasileiros pra ficar reconhecível no card visual.
const COLORS = ['#ec7000', '#8a05be', '#cc092f', '#ff7a00', '#003595', '#0b8a3e']

function newId() {
  return '_' + Math.random().toString(36).slice(2)
}

export function CartaoModal({ open, onClose, editing }: Props) {
  const data = useData((s) => s.data)
  const replaceAll = useData((s) => s.replaceAll)

  const isEdit = !!editing
  const [banco, setBanco] = useState('')
  const [nome, setNome] = useState('')
  const [ultimos, setUltimos] = useState('')
  const [limite, setLimite] = useState('0')
  const [fechamento, setFechamento] = useState('25')
  const [vencimento, setVencimento] = useState('3')
  const [cor, setCor] = useState(COLORS[0])
  const [error, setError] = useState<string | null>(null)

  // Reset ao reabrir (padrão render-phase, sem useEffect — React docs).
  const [prevOpenKey, setPrevOpenKey] = useState<string>('')
  const openKey = open ? ((editing?.id as string) ?? 'new') : ''
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setBanco((editing?.banco as string) ?? '')
      setNome(editing ? cartaoNome(editing) : '')
      setUltimos((editing?.ultimosDigitos as string) ?? '')
      setLimite(editing ? String(cartaoLimite(editing)) : '0')
      setFechamento(editing && cartaoFechamento(editing) != null ? String(cartaoFechamento(editing)) : '25')
      setVencimento(editing && cartaoVencimento(editing) != null ? String(cartaoVencimento(editing)) : '3')
      setCor(editing ? cartaoCor(editing) : COLORS[0])
      setError(null)
    }
  }

  function save() {
    if (!banco.trim()) { setError('Informe o banco.'); return }
    if (!nome.trim()) { setError('Informe um nome pro cartão.'); return }
    const lim = parseFloat(limite.replace(',', '.'))
    if (!Number.isFinite(lim) || lim < 0) { setError('Limite inválido.'); return }
    const fc = parseInt(fechamento, 10)
    const vc = parseInt(vencimento, 10)
    if (!Number.isFinite(fc) || fc < 1 || fc > 28) { setError('Dia de fechamento entre 1 e 28.'); return }
    if (!Number.isFinite(vc) || vc < 1 || vc > 28) { setError('Dia de vencimento entre 1 e 28.'); return }

    const d = data ?? { cartoes: [] }
    const cartoesRaw = (d as unknown as { cartoes?: CartaoLike[] }).cartoes ?? []
    const cartoes: CartaoLike[] = Array.isArray(cartoesRaw) ? [...cartoesRaw] : []
    const payload: CartaoLike = {
      id: editing?.id ?? newId(),
      banco: banco.trim(),
      nome: nome.trim(),
      // mantém aliases Dino pra interop
      name: nome.trim(),
      ultimosDigitos: ultimos.trim() || null,
      limite: lim,
      limit: lim,
      fechamento: fc,
      closingDay: fc,
      vencimento: vc,
      dueDay: vc,
      cor,
      color: cor,
      parcelas: editing?.parcelas ?? [],
    }
    if (isEdit && editing) {
      const idx = cartoes.findIndex((c) => c.id === editing.id)
      if (idx >= 0) cartoes[idx] = { ...cartoes[idx], ...payload }
      else cartoes.push(payload)
    } else {
      cartoes.push(payload)
    }
    replaceAll({ ...(d as object), cartoes } as unknown as Parameters<typeof replaceAll>[0])
    onClose()
  }

  function remove() {
    if (!editing) return
    if (!confirm('Excluir este cartão? As despesas com cartaoId vinculado ficam sem cartão.')) return
    const d = data ?? { cartoes: [] }
    const cartoesRaw = (d as unknown as { cartoes?: CartaoLike[] }).cartoes ?? []
    const cartoes = (Array.isArray(cartoesRaw) ? cartoesRaw : []).filter((c) => c.id !== editing.id)
    replaceAll({ ...(d as object), cartoes } as unknown as Parameters<typeof replaceAll>[0])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cartão' : 'Novo cartão'}
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
        <Field label="Banco / Emissor" className="sm:col-span-2">
          <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Itaú, Nubank, Inter…" autoFocus />
        </Field>
        <Field label="Nome do cartão" className="sm:col-span-2">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Itaú Click Visa" />
        </Field>
        <Field label="Últimos 4 dígitos">
          <Input
            value={ultimos}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => setUltimos(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
          />
        </Field>
        <Field label="Limite (R$)">
          <Input type="number" step="100" inputMode="decimal" value={limite} onChange={(e) => setLimite(e.target.value)} />
        </Field>
        <Field label="Fecha dia">
          <Input type="number" min={1} max={28} value={fechamento} onChange={(e) => setFechamento(e.target.value)} />
        </Field>
        <Field label="Vence dia">
          <Input type="number" min={1} max={28} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </Field>
        <Field label="Cor do cartão" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
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
            <label className="ml-2 flex items-center gap-2 text-xs text-mist">
              <span>Custom</span>
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-line bg-transparent"
              />
            </label>
          </div>
        </Field>
      </div>
      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}
