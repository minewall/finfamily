import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Mail,
  Inbox,
  Check,
  LayoutDashboard,
  Plus,
  Settings2,
} from 'lucide-react'
import {
  personColor,
  personInitial,
  FAMILIA_COLETIVO,
} from '@haile/shared'
import type { UserData } from '@haile/shared'
import { useAuth } from '@/lib/auth'
import { useData } from '@/store/useData'
import { useFamily } from '@/store/useFamily'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import {
  WIDGET_DEFS,
  WIDGET_ORDER_DEFAULT,
  getActiveWidgets,
  type WidgetId,
} from '@/lib/painel-widgets'
import { WidgetResumo } from '@/components/painel/WidgetResumo'
import { WidgetMetas } from '@/components/painel/WidgetMetas'
import { WidgetAlertas } from '@/components/painel/WidgetAlertas'
import { WidgetVencimentos } from '@/components/painel/WidgetVencimentos'

/**
 * Resolve a "pessoa do user logado" no blob `data`:
 *  - Member: usa context.pessoaName (definido no convite).
 *  - Owner solo: usa a primeira pessoa cadastrada (heurística do Dino).
 *  - Fallback: primeiro nome do e-mail.
 */
function resolveEu(
  data: UserData | null,
  pessoaContext: string | null | undefined,
  email: string | undefined,
): string {
  if (pessoaContext) return pessoaContext
  const list = data?.pessoas ?? []
  if (list.length) return list[0]
  if (email) {
    const part = email.split('@')[0]
    return part.charAt(0).toUpperCase() + part.slice(1)
  }
  return 'Eu'
}

function renderWidget(id: WidgetId, data: UserData) {
  switch (id) {
    case 'resumo':
      return <WidgetResumo data={data} />
    case 'metas':
      return <WidgetMetas data={data} />
    case 'alertas':
      return <WidgetAlertas data={data} />
    case 'vencimentos':
      return <WidgetVencimentos data={data} />
    default:
      return null
  }
}

export default function MeuPainel() {
  const { session } = useAuth()
  const { data, loading, load } = useData()
  const setPainelWidgets = useData((s) => s.setPainelWidgets)
  const { context, myPendingInvites, loadFamily, accept } = useFamily()

  const [editOpen, setEditOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])
  useEffect(() => {
    void loadFamily()
  }, [loadFamily])

  const email = session?.user?.email ?? ''
  const eu = useMemo(
    () => resolveEu(data, context?.pessoaName, email),
    [data, context, email],
  )

  const active = useMemo<WidgetId[]>(() => getActiveWidgets(data), [data])

  async function handleAccept(memberId: string) {
    const res = await accept(memberId)
    if ('error' in res) alert(res.error)
    else if ('expired' in res) alert('Esse convite expirou. Peça pra quem te convidou reenviar.')
    else if ('ok' in res) {
      alert('Convite aceito! Você agora faz parte dessa família.')
      window.location.reload()
    }
  }

  function toggleWidget(id: WidgetId) {
    const has = active.includes(id)
    const next = has ? active.filter((x) => x !== id) : [...active, id]
    setPainelWidgets(next)
  }

  function addWidget(id: WidgetId) {
    if (active.includes(id)) return
    setPainelWidgets([...active, id])
    setAddMenuOpen(false)
  }

  function resetDefaults() {
    setPainelWidgets(WIDGET_ORDER_DEFAULT.slice())
  }

  if (loading && !data) {
    return <div className="mx-auto max-w-5xl px-5 py-8 text-mist">Carregando…</div>
  }

  const availableToAdd = (Object.keys(WIDGET_DEFS) as WidgetId[]).filter(
    (id) => !active.includes(id),
  )

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Header com identidade do user */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: personColor(eu) }}
        >
          {personInitial(eu)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-ink">Meu Painel</h1>
          <p className="text-sm text-mist">
            {eu === FAMILIA_COLETIVO ? 'Visão coletiva' : `Sua visão individual${email ? ' · ' + email : ''}`}
          </p>
          {context && (
            <p className="mt-1 text-[11px] text-faint">
              {context.role === 'admin'
                ? 'Você administra a família.'
                : `Você participa de uma família como ${context.role}.`}
            </p>
          )}
        </div>
        <Link
          to="/familia"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-mist hover:bg-elevated hover:text-ink"
        >
          Ver Painel da Família
        </Link>
      </header>

      {/* Convites recebidos pra ENTRAR em família */}
      {myPendingInvites.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber/40 bg-amber/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber">
            <Inbox size={16} />
            <span className="text-sm font-semibold">
              Você tem {myPendingInvites.length} convite{myPendingInvites.length === 1 ? '' : 's'} pra entrar em uma família
            </span>
          </div>
          <ul className="space-y-2">
            {myPendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/30 bg-bg/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">Convite pendente</div>
                  <div className="text-[11px] text-mist">Papel: {inv.role}</div>
                </div>
                <Button variant="primary" size="sm" onClick={() => void handleAccept(inv.id)}>
                  <Check size={14} /> Aceitar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Barra de ações dos widgets */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-mist">
          <LayoutDashboard size={14} />
          <span>
            {active.length} widget{active.length === 1 ? '' : 's'} ativo{active.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-mist hover:bg-elevated hover:text-ink"
          >
            <Settings2 size={14} /> Editar widgets
          </button>
          <button
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            disabled={availableToAdd.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} /> Adicionar Widget
          </button>

          {addMenuOpen && availableToAdd.length > 0 && (
            <>
              {/* Backdrop pra fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setAddMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg">
                {availableToAdd.map((id) => {
                  const def = WIDGET_DEFS[id]
                  const Icon = def.icon
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => addWidget(id)}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-elevated"
                    >
                      <Icon size={16} className="mt-0.5 shrink-0 text-indigo" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink">{def.label}</div>
                        <div className="text-[11px] text-faint">{def.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid de widgets */}
      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <LayoutDashboard size={22} className="mx-auto mb-2 text-faint" />
          <div className="font-medium text-ink">Adicione widgets pra montar seu painel.</div>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mist">
            Escolha o que quer acompanhar logo na abertura — resumo do mês, metas, alertas, vencimentos.
          </p>
          <button
            type="button"
            onClick={resetDefaults}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg/40 px-3 py-1.5 text-xs font-medium text-mist hover:bg-elevated hover:text-ink"
          >
            <Plus size={14} /> Restaurar widgets padrão
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {data
            ? active.map((id) => <div key={id}>{renderWidget(id, data)}</div>)
            : null}
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-8 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-mist">
        <User size={12} className="mr-1 inline" />
        Esta é sua visão individual. Pra ver o consolidado da família,{' '}
        <Link to="/familia" className="text-indigo hover:underline">
          abra o Painel da Família
        </Link>
        .
        {email && (
          <>
            {' '}
            <Mail size={12} className="ml-2 mr-1 inline" />
            {email}
          </>
        )}
      </div>

      {/* Modal de edição de widgets */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar widgets"
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetDefaults}
              className="text-xs font-medium text-mist hover:text-ink"
            >
              Restaurar padrão
            </button>
            <Button variant="primary" size="sm" onClick={() => setEditOpen(false)}>
              Pronto
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-mist">
          Escolha o que quer ver no seu painel. As mudanças são salvas automaticamente.
        </p>
        <ul className="flex flex-col gap-2">
          {(Object.keys(WIDGET_DEFS) as WidgetId[]).map((id) => {
            const def = WIDGET_DEFS[id]
            const Icon = def.icon
            const on = active.includes(id)
            return (
              <li key={id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    on
                      ? 'border-indigo/40 bg-indigo/5'
                      : 'border-line bg-bg/40 hover:border-line/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-indigo"
                    checked={on}
                    onChange={() => toggleWidget(id)}
                  />
                  <Icon size={16} className="mt-0.5 shrink-0 text-indigo" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{def.label}</div>
                    <div className="text-[11px] text-faint">{def.desc}</div>
                  </div>
                </label>
              </li>
            )
          })}
        </ul>
      </Modal>
    </div>
  )
}
