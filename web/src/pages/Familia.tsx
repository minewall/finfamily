import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  TrendingDown,
  Scale,
  Mail,
  UserPlus,
  Send,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import {
  currencyBRL,
  personColor,
  personInitial,
  getReceitasByPessoa,
  getDespesasByPessoa,
  calcContribuicaoMembro,
  getMetasFamilia,
  pessoasNoMes,
  FAMILIA_COLETIVO,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { useFamily } from '@/store/useFamily'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import { ConvidarMembroModal } from '@/components/ConvidarMembroModal'
import { inviteStatus, type FamilyMemberRow } from '@/lib/family'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Familia() {
  const { data, loading, error, load, addPessoa, renamePessoa, deletePessoa } = useData()
  const {
    members,
    pendingInvites,
    context,
    loadFamily,
    remove: removeMember,
    resend: resendInvite,
    cancel: cancelInvite,
  } = useFamily()

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  useEffect(() => {
    void loadFamily()
  }, [loadFamily])

  const [modalConvidar, setModalConvidar] = useState(false)
  const [membroBusy, setMembroBusy] = useState<string | null>(null)
  const [membroMsg, setMembroMsg] = useState<string | null>(null)
  const [membroErr, setMembroErr] = useState<string | null>(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [modalAdd, setModalAdd] = useState(false)
  const [modalEdit, setModalEdit] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [editNome, setEditNome] = useState('')
  const [erroPessoa, setErroPessoa] = useState<string | null>(null)

  const pessoasOrdenadas = useMemo(() => {
    if (!data) return []
    return pessoasNoMes(data, year, month)
  }, [data, month, year])

  const rec = useMemo(() => (data ? getReceitasByPessoa(data, year, month) : {}), [data, month, year])
  const desp = useMemo(() => (data ? getDespesasByPessoa(data, year, month) : {}), [data, month, year])

  const totalRec = Object.values(rec).reduce((s, x) => s + x.total, 0)
  const totalDesp = Object.values(desp).reduce((s, x) => s + x.total, 0)
  const saldoFamilia = totalRec - totalDesp

  const metasFamilia = useMemo(() => (data ? getMetasFamilia(data) : []), [data])

  if (loading && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-mist">Carregando…</div>
  }
  if (error && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-red">Erro: {error}</div>
  }

  function handleAdd() {
    setErroPessoa(null)
    try {
      addPessoa(novoNome)
      setNovoNome('')
      setModalAdd(false)
    } catch (e) {
      setErroPessoa(e instanceof Error ? e.message : 'Erro')
    }
  }

  function handleRename(oldName: string) {
    setErroPessoa(null)
    try {
      renamePessoa(oldName, editNome)
      setEditNome('')
      setModalEdit(null)
    } catch (e) {
      setErroPessoa(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function handleResend(memberId: string) {
    setMembroErr(null); setMembroMsg(null)
    setMembroBusy(memberId)
    const res = await resendInvite(memberId)
    setMembroBusy(null)
    if (res.error) setMembroErr(res.error)
    else setMembroMsg('Convite reenviado.')
  }

  async function handleCancelInvite(memberId: string) {
    if (!confirm('Cancelar este convite pendente?')) return
    setMembroErr(null); setMembroMsg(null)
    setMembroBusy(memberId)
    const res = await cancelInvite(memberId)
    setMembroBusy(null)
    if (res.error) setMembroErr(res.error)
    else setMembroMsg('Convite cancelado.')
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remover este membro? Ele perde acesso à família imediatamente.')) return
    setMembroErr(null); setMembroMsg(null)
    setMembroBusy(memberId)
    const res = await removeMember(memberId)
    setMembroBusy(null)
    if (res.error) setMembroErr(res.error)
    else setMembroMsg('Membro removido.')
  }

  function handleDelete(pessoa: string) {
    setErroPessoa(null)
    try {
      if (!confirm(`Remover "${pessoa}" da família?\n\nReceitas/despesas que referenciam essa pessoa precisam ser reatribuídas antes.`)) return
      deletePessoa(pessoa)
      setModalEdit(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro'
      setErroPessoa(msg)
      alert(msg)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Painel da Família</h1>
          <p className="text-sm text-mist">Quem contribui com o quê — e como o saldo coletivo está {MESES[month - 1].toLowerCase()} de {year}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalAdd(true)}>
            <Plus size={14} /> Adicionar pessoa
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModalConvidar(true)}>
            <UserPlus size={14} /> Convidar membro
          </Button>
        </div>
      </header>

      {/* Seletor mês/ano + saldo coletivo */}
      <section className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-indigo/10 to-teal/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            >
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            >
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-baseline gap-6">
            <Kpi label="Receita do mês" value={currencyBRL(totalRec)} icon={<TrendingUp size={14} />} tone="text-green" />
            <Kpi label="Despesa do mês" value={currencyBRL(totalDesp)} icon={<TrendingDown size={14} />} tone="text-red" />
            <Kpi
              label="Saldo coletivo"
              value={currencyBRL(saldoFamilia)}
              icon={<Scale size={14} />}
              tone={saldoFamilia >= 0 ? 'text-green' : 'text-red'}
            />
          </div>
        </div>
      </section>

      {/* Cards por pessoa */}
      {pessoasOrdenadas.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <Users size={28} className="mx-auto mb-3 text-faint" />
          <div className="font-medium text-ink">Nenhuma pessoa cadastrada ainda</div>
          <p className="mt-1 text-sm text-mist">
            Adicione membros da família pra ver quem contribui com receita e quem mais gera despesa.
          </p>
          <Button className="mt-4" variant="primary" size="sm" onClick={() => setModalAdd(true)}>
            <Plus size={14} /> Adicionar primeira pessoa
          </Button>
        </div>
      ) : (
        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          {pessoasOrdenadas.map((pessoa) => {
            const c = data ? calcContribuicaoMembro(data, pessoa, year, month) : null
            const isColetivo = pessoa === FAMILIA_COLETIVO
            const liquido = c?.contribuicaoLiquida ?? 0
            return (
              <article key={pessoa} className="rounded-2xl border border-line bg-surface p-5">
                <header className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: personColor(pessoa) }}
                    >
                      {personInitial(pessoa)}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-ink">{pessoa}</div>
                      <div className="text-[11px] text-faint">
                        {isColetivo ? 'Despesas comuns / sem titular' : 'Membro da família'}
                      </div>
                    </div>
                  </div>
                  {!isColetivo && (
                    <button
                      type="button"
                      onClick={() => { setEditNome(pessoa); setModalEdit(pessoa) }}
                      className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
                      aria-label={`Editar ${pessoa}`}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </header>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Mini label="Receita" value={currencyBRL(c?.receita ?? 0)} tone="text-green" />
                  <Mini label="Despesa" value={currencyBRL(c?.despesa ?? 0)} tone="text-red" />
                  <Mini
                    label="Saldo"
                    value={currencyBRL(liquido)}
                    tone={liquido >= 0 ? 'text-green' : 'text-red'}
                  />
                </div>

                {c && (totalRec > 0 || totalDesp > 0) && (
                  <div className="mt-4 space-y-1.5">
                    {totalRec > 0 && <Bar label="% da receita" pct={c.pctReceita} color="bg-green" />}
                    {totalDesp > 0 && <Bar label="% da despesa" pct={c.pctDespesa} color="bg-red" />}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {/* Membros da família + convites */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Membros da família</h2>
          <Button variant="ghost" size="sm" onClick={() => setModalConvidar(true)}>
            <UserPlus size={14} /> Convidar
          </Button>
        </div>

        {(membroErr || membroMsg) && (
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              membroErr ? 'border-red/40 bg-red/10 text-red' : 'border-green/40 bg-green/10 text-green'
            }`}
          >
            {membroErr ?? membroMsg}
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
            <Mail size={22} className="mx-auto mb-2 text-faint" />
            <div className="font-medium text-ink">Ninguém convidado ainda</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-mist">
              Convide cônjuge, filhos ou parceiro pra co-administrar as finanças. Eles recebem um link de acesso por e-mail.
            </p>
            <Button className="mt-4" variant="primary" size="sm" onClick={() => setModalConvidar(true)}>
              <Send size={14} /> Enviar primeiro convite
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <MembroRow
                key={m.id}
                membro={m}
                busy={membroBusy === m.id}
                isOwner={!!context && context.role === 'admin'}
                onResend={() => void handleResend(m.id)}
                onCancel={() => void handleCancelInvite(m.id)}
                onRemove={() => void handleRemoveMember(m.id)}
              />
            ))}
          </ul>
        )}

        {pendingInvites.length > 0 && (
          <p className="mt-2 text-[11px] text-faint">
            {pendingInvites.length} convite{pendingInvites.length === 1 ? '' : 's'} ainda pendente{pendingInvites.length === 1 ? '' : 's'}.
          </p>
        )}
      </section>

      {/* Metas de família */}
      {metasFamilia.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Metas da Família</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {metasFamilia.map((m) => {
              const target = Number(m.target ?? 0)
              const current = Number(m.current ?? 0)
              const pct = target > 0 ? (current / target) * 100 : 0
              return (
                <article key={m.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-indigo" />
                    <span className="text-[14px] font-medium text-ink">{m.label}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-ink">{currencyBRL(current)}</span>
                    <span className="text-xs text-mist">de {currencyBRL(target)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div className="h-full bg-indigo" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* Modal: adicionar pessoa */}
      <Modal open={modalAdd} onClose={() => { setModalAdd(false); setErroPessoa(null) }} title="Nova pessoa na família">
        <Field label="Nome" hint={erroPessoa ?? 'Como você quer chamar essa pessoa no app?'}>
          <Input
            autoFocus
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex.: Mariana, João..."
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setModalAdd(false); setErroPessoa(null) }}>Cancelar</Button>
          <Button variant="primary" onClick={handleAdd}>Adicionar</Button>
        </div>
      </Modal>

      {/* Modal: convidar membro */}
      <ConvidarMembroModal open={modalConvidar} onClose={() => setModalConvidar(false)} />

      {/* Modal: editar/excluir pessoa */}
      <Modal
        open={!!modalEdit}
        onClose={() => { setModalEdit(null); setErroPessoa(null) }}
        title={modalEdit ? `Editar "${modalEdit}"` : 'Editar pessoa'}
      >
        {modalEdit && (
          <>
            <Field label="Nome" hint={erroPessoa ?? 'Renomear propaga pra todas as receitas, despesas e splits.'}>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </Field>
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <Button variant="outline" onClick={() => handleDelete(modalEdit)}>
                <Trash2 size={14} /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setModalEdit(null); setErroPessoa(null) }}>Cancelar</Button>
                <Button variant="primary" onClick={() => handleRename(modalEdit)}>Salvar</Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
        {icon} {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-elevated/30 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-[13px] font-bold ${tone}`}>{value}</div>
    </div>
  )
}

function MembroRow({
  membro,
  busy,
  isOwner,
  onResend,
  onCancel,
  onRemove,
}: {
  membro: FamilyMemberRow
  busy: boolean
  isOwner: boolean
  onResend: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  const status = inviteStatus(membro)
  const email = membro.invited_email ?? '—'
  const pessoa = membro.pessoa_name ?? null
  const role = membro.role || 'member'

  const statusBadge =
    status === 'active' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[11px] font-semibold text-green">
        <CheckCircle2 size={11} /> Ativo
      </span>
    ) : status === 'expired' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-red/15 px-2 py-0.5 text-[11px] font-semibold text-red">
        <AlertTriangle size={11} /> Expirado
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">
        <Clock size={11} /> Pendente
      </span>
    )

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div
        className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: personColor(pessoa ?? email) }}
      >
        {personInitial(pessoa ?? email)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{pessoa ?? email}</span>
          {statusBadge}
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-mist">
            <ShieldCheck size={11} /> {role}
          </span>
        </div>
        {pessoa && <div className="truncate text-[11px] text-faint">{email}</div>}
      </div>
      {isOwner && (
        <div className="flex items-center gap-1">
          {status !== 'active' && (
            <button
              type="button"
              onClick={onResend}
              disabled={busy}
              className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink disabled:opacity-40"
              aria-label="Reenviar convite"
              title="Reenviar convite"
            >
              <Send size={14} />
            </button>
          )}
          {status === 'active' ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-red disabled:opacity-40"
              aria-label="Remover membro"
              title="Remover membro"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-red disabled:opacity-40"
              aria-label="Cancelar convite"
              title="Cancelar convite"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-faint">
        <span>{label}</span>
        <span>{clamped.toFixed(0)}%</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-elevated">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
