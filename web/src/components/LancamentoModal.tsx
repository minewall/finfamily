import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Users, EyeOff, Receipt as ReceiptIcon } from 'lucide-react'
import {
  CATEGORIES,
  FAMILIA_COLETIVO,
  type Despesa,
  type Receita,
  type ReembolsoInfo,
  type UnifiedLancamento,
} from '@haile/shared'
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

interface SplitDraft {
  person: string
  valor: string // string p/ controlar input livre
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
  // Lista pra escolher em split/reembolso (inclui "Família" como bucket coletivo)
  const pessoasParaSplit = useMemo(() => [...pessoas, FAMILIA_COLETIVO], [pessoas])

  const isEdit = !!editing
  const editingDespesa = (isEdit && editing?.kind === 'despesa' ? (editing as unknown as Despesa) : null)

  const [kind, setKind] = useState<'despesa' | 'receita'>(editing?.kind ?? defaultKind ?? 'despesa')
  const [desc, setDesc] = useState(editing?.desc ?? '')
  const [amount, setAmount] = useState<string>(editing?.amount?.toString() ?? '')
  const [date, setDate] = useState(editing?.date ?? todayISO())
  const [person, setPerson] = useState(editing?.person ?? pessoas[0] ?? 'Você')
  const [category, setCategory] = useState(editing?.category ?? (editing?.kind === 'receita' ? 'receita' : 'alimentacao'))
  const [contaId, setContaId] = useState(editing?.contaId ?? '')
  const [visibilidade, setVisibilidade] = useState<'familiar' | 'particular'>(
    (editingDespesa?.visibilidade as 'familiar' | 'particular') ?? 'familiar',
  )

  // Split state
  const [splitOn, setSplitOn] = useState<boolean>(!!editingDespesa?.split?.length)
  const [splits, setSplits] = useState<SplitDraft[]>(
    editingDespesa?.split?.map((s) => ({ person: s.person, valor: String(s.valor) })) ?? [],
  )

  // Reembolso state
  const [reembolsoOn, setReembolsoOn] = useState<boolean>(!!editingDespesa?.reembolso)
  const [reembDe, setReembDe] = useState<string>(editingDespesa?.reembolso?.de ?? FAMILIA_COLETIVO)
  const [reembValor, setReembValor] = useState<string>(editingDespesa?.reembolso?.valor?.toString() ?? '')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset ao reabrir
  useEffect(() => {
    if (!open) return
    const ed = (editing?.kind === 'despesa' ? (editing as unknown as Despesa) : null)
    setKind(editing?.kind ?? defaultKind ?? 'despesa')
    setDesc(editing?.desc ?? '')
    setAmount(editing?.amount?.toString() ?? '')
    setDate(editing?.date ?? todayISO())
    setPerson(editing?.person ?? pessoas[0] ?? 'Você')
    setCategory(editing?.category ?? (editing?.kind === 'receita' ? 'receita' : 'alimentacao'))
    setContaId(editing?.contaId ?? '')
    setVisibilidade((ed?.visibilidade as 'familiar' | 'particular') ?? 'familiar')
    setSplitOn(!!ed?.split?.length)
    setSplits(ed?.split?.map((s) => ({ person: s.person, valor: String(s.valor) })) ?? [])
    setReembolsoOn(!!ed?.reembolso)
    setReembDe(ed?.reembolso?.de ?? FAMILIA_COLETIVO)
    setReembValor(ed?.reembolso?.valor?.toString() ?? '')
    setError(null)
    setSubmitting(false)
  }, [open, editing, defaultKind, pessoas])

  // Se mudar o tipo num NOVO lançamento, ajusta categoria default
  useEffect(() => {
    if (isEdit || !open) return
    setCategory(kind === 'receita' ? 'receita' : 'alimentacao')
    // Receita não tem split/reembolso/visibilidade
    if (kind === 'receita') {
      setSplitOn(false)
      setReembolsoOn(false)
    }
  }, [kind, open, isEdit])

  function addSplitRow() {
    // Sugere primeira pessoa que ainda não está na lista
    const usadas = new Set(splits.map((s) => s.person))
    const sugerida = pessoasParaSplit.find((p) => !usadas.has(p)) ?? pessoasParaSplit[0]
    setSplits([...splits, { person: sugerida, valor: '' }])
    setSplitOn(true)
  }

  function updateSplit(i: number, patch: Partial<SplitDraft>) {
    setSplits(splits.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  function removeSplit(i: number) {
    const novo = splits.filter((_, idx) => idx !== i)
    setSplits(novo)
    if (novo.length === 0) setSplitOn(false)
  }

  // Cálculos auxiliares
  const amountNum = parseFloat((amount || '').replace(',', '.')) || 0
  const splitSum = splits.reduce((s, x) => s + (parseFloat((x.valor || '').replace(',', '.')) || 0), 0)
  const splitResto = Math.max(0, amountNum - splitSum)

  function save() {
    const v = parseFloat(amount.replace(',', '.'))
    if (!desc.trim() || !date || !Number.isFinite(v) || v <= 0) {
      setError('Preencha descrição, valor (> 0) e data.')
      return
    }

    // Validações split
    let splitFinal: Array<{ person: string; valor: number }> | null = null
    if (splitOn && splits.length > 0) {
      const limpos: Array<{ person: string; valor: number }> = []
      for (const s of splits) {
        const val = parseFloat((s.valor || '').replace(',', '.'))
        if (!s.person) {
          setError('Cada rateio precisa de uma pessoa.')
          return
        }
        if (!Number.isFinite(val) || val <= 0) {
          setError(`Rateio de "${s.person}" precisa de valor > 0.`)
          return
        }
        limpos.push({ person: s.person, valor: val })
      }
      const sum = limpos.reduce((acc, x) => acc + x.valor, 0)
      if (sum > v + 0.01) {
        setError(`A soma do rateio (R$ ${sum.toFixed(2)}) não pode passar do valor total (R$ ${v.toFixed(2)}).`)
        return
      }
      // Resto positivo é OK — vai pra bucket "Família" automaticamente no cálculo
      splitFinal = limpos
    }

    // Validações reembolso
    let reembolsoFinal: ReembolsoInfo | null = null
    if (reembolsoOn) {
      const rv = parseFloat((reembValor || '').replace(',', '.'))
      if (!reembDe) { setError('Reembolso precisa de "Quem devolve".'); return }
      if (!Number.isFinite(rv) || rv <= 0) { setError('Reembolso precisa de valor > 0.'); return }
      if (rv > v + 0.01) { setError('Reembolso não pode ser maior que o valor total.'); return }
      const previo = editingDespesa?.reembolso
      reembolsoFinal = {
        para: person,
        de: reembDe,
        valor: rv,
        status: previo?.status ?? 'pendente',
        criadoEm: previo?.criadoEm ?? todayISO(),
        ...(previo?.paidAt ? { paidAt: previo.paidAt } : {}),
      }
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
      visibilidade,
      split: splitFinal,
      reembolso: reembolsoFinal,
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
      size="lg"
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

      {/* ── Blocos avançados (só pra despesa) ───────────────────── */}
      {kind === 'despesa' && (
        <div className="mt-5 space-y-3">
          {/* Visibilidade */}
          <section className="rounded-xl border border-line bg-elevated/30 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <EyeOff size={14} className="text-mist" />
              Visibilidade
            </div>
            <div className="mt-2 inline-flex rounded-lg border border-line-2 bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setVisibilidade('familiar')}
                className={
                  'rounded-md px-3 py-1 text-[11px] font-semibold ' +
                  (visibilidade === 'familiar' ? 'bg-indigo/15 text-indigo' : 'text-mist hover:text-ink')
                }
              >
                Familiar
              </button>
              <button
                type="button"
                onClick={() => setVisibilidade('particular')}
                className={
                  'rounded-md px-3 py-1 text-[11px] font-semibold ' +
                  (visibilidade === 'particular' ? 'bg-indigo/15 text-indigo' : 'text-mist hover:text-ink')
                }
              >
                Particular
              </button>
            </div>
            <p className="mt-1.5 text-[10.5px] text-faint">
              {visibilidade === 'familiar'
                ? 'Aparece no painel da família e contribui pro cálculo coletivo.'
                : 'Fica só com o titular — não aparece pros outros membros.'}
            </p>
          </section>

          {/* Split */}
          <section className="rounded-xl border border-line bg-elevated/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                <Users size={14} className="text-mist" />
                Ratear entre pessoas
              </div>
              {!splitOn ? (
                <Button variant="outline" size="sm" onClick={addSplitRow}>
                  <Plus size={12} /> Adicionar rateio
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setSplitOn(false); setSplits([]) }}
                  className="text-[11px] text-mist hover:text-red"
                >
                  Remover rateio
                </button>
              )}
            </div>

            {splitOn && (
              <div className="mt-3 space-y-2">
                {splits.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={s.person}
                      onChange={(e) => updateSplit(i, { person: e.target.value })}
                      className="flex-1"
                    >
                      {pessoasParaSplit.map((p) => <option key={p}>{p}</option>)}
                    </Select>
                    <Input
                      type="number" step="0.01" inputMode="decimal"
                      value={s.valor}
                      onChange={(e) => updateSplit(i, { valor: e.target.value })}
                      placeholder="0,00"
                      className="w-28"
                    />
                    <button
                      type="button"
                      onClick={() => removeSplit(i)}
                      className="rounded p-1 text-mist hover:bg-elevated hover:text-red"
                      aria-label="Remover rateio"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addSplitRow}>
                  <Plus size={12} /> Adicionar mais
                </Button>

                {amountNum > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <Mini label="Total da despesa" value={`R$ ${amountNum.toFixed(2)}`} />
                    <Mini label="Soma do rateio" value={`R$ ${splitSum.toFixed(2)}`} />
                    <Mini
                      label="Resto (vai pra Família)"
                      value={`R$ ${splitResto.toFixed(2)}`}
                      tone={splitResto > 0.01 ? 'text-amber' : 'text-mist'}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Reembolso */}
          <section className="rounded-xl border border-line bg-elevated/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                <ReceiptIcon size={14} className="text-mist" />
                Aguardando reembolso
              </div>
              <label className="flex items-center gap-2 text-[11px] text-mist">
                <input
                  type="checkbox"
                  checked={reembolsoOn}
                  onChange={(e) => {
                    setReembolsoOn(e.target.checked)
                    if (e.target.checked && !reembValor) setReembValor(amount)
                  }}
                  className="h-4 w-4 accent-amber"
                />
                Marcar
              </label>
            </div>

            {reembolsoOn && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Quem devolve">
                  <Select value={reembDe} onChange={(e) => setReembDe(e.target.value)}>
                    {pessoasParaSplit.filter((p) => p !== person).map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Valor a reembolsar">
                  <Input
                    type="number" step="0.01" inputMode="decimal"
                    value={reembValor}
                    onChange={(e) => setReembValor(e.target.value)}
                    placeholder="0,00"
                  />
                </Field>
                <p className="text-[10.5px] text-faint sm:col-span-2">
                  Você ({person}) pagou — {reembDe} deve devolver. Quando receber, marque como pago em /reembolsos.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red">{error}</p>}
    </Modal>
  )
}

function Mini({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-[12px] font-bold ${tone}`}>{value}</div>
    </div>
  )
}
