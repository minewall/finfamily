import { useMemo, useState } from 'react'
import { Sparkles, ChevronRight, Check, X } from 'lucide-react'
import {
  PHASE_HINTS,
  getUserPhase,
  nextPendingByCategory,
  perguntasPendentes,
  shouldShowQuestionToday,
  type CadencePhase,
  type ContextoState,
  type PerguntaSpec,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/field'

interface PickResult {
  pergunta: PerguntaSpec
  reason: 'trigger-first-meta' | 'cadence'
}

function pickPergunta(
  ctx: ContextoState,
  triggers: Record<string, unknown>,
): PickResult | null {
  if (triggers.firstMetaPending === true) {
    const p = nextPendingByCategory(ctx, 'dreams')
    if (p) return { pergunta: p, reason: 'trigger-first-meta' }
  }
  const pendentes = perguntasPendentes(ctx)
  if (pendentes.length === 0) return null
  return { pergunta: pendentes[0], reason: 'cadence' }
}

export function PerguntaDoDiaCard() {
  const {
    data,
    getContexto,
    addContextoResposta,
    markDailyQuestionShown,
    clearCoachTrigger,
  } = useData()
  const [opcaoEscolhida, setOpcaoEscolhida] = useState('')
  const [textoExtra, setTextoExtra] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [dismissedNow, setDismissedNow] = useState(false)

  const ctx: ContextoState = useMemo(() => (data ? getContexto() : {}), [data, getContexto])
  const triggers = useMemo(
    () => (data?.coachTriggers ?? {}) as Record<string, unknown>,
    [data?.coachTriggers],
  )
  const daily = data?.coachDailyQuestion ?? {}
  const signupISO =
    data?.onboarding?.startedAt ??
    data?.onboarding?.completedAt ??
    null

  const phase: CadencePhase = useMemo(
    () => getUserPhase(signupISO),
    [signupISO],
  )

  const cadenceOk = useMemo(
    () => shouldShowQuestionToday(signupISO, daily.lastShownAt ?? null),
    [signupISO, daily.lastShownAt],
  )

  const triggerActive = triggers.firstMetaPending === true
  const pick = useMemo(
    () => (triggerActive || cadenceOk ? pickPergunta(ctx, triggers) : null),
    [triggerActive, cadenceOk, ctx, triggers],
  )

  if (!data || dismissedNow || !pick) return null

  function abrir() {
    if (!pick) return
    setOpcaoEscolhida('')
    setTextoExtra('')
    setModalAberto(true)
  }

  function salvar() {
    if (!pick) return
    const opcao = pick.pergunta.opcoes.find((o) => o.id === opcaoEscolhida)
    if (!opcao) return
    addContextoResposta(pick.pergunta.categoria, {
      perguntaId: pick.pergunta.id,
      pergunta: pick.pergunta.pergunta,
      resposta: opcao.label,
      opcaoId: opcao.id,
      extra: textoExtra,
    })
    markDailyQuestionShown(pick.pergunta.id)
    if (pick.reason === 'trigger-first-meta') clearCoachTrigger('firstMetaPending')
    setModalAberto(false)
  }

  function dispensar() {
    if (!pick) return
    markDailyQuestionShown(pick.pergunta.id)
    if (pick.reason === 'trigger-first-meta') clearCoachTrigger('firstMetaPending')
    setDismissedNow(true)
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-indigo/50 bg-indigo/8 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo">
              <Sparkles size={14} />
              {pick.reason === 'trigger-first-meta'
                ? 'Pergunta da semana — sobre seu objetivo'
                : 'Pergunta do dia'}
            </div>
            <h3 className="mt-1 text-lg font-bold text-ink">
              {pick.pergunta.pergunta}
            </h3>
            <div className="mt-1 text-xs text-faint">{PHASE_HINTS[phase]}</div>
          </div>
          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar por hoje"
            className="rounded-md p-1 text-mist hover:bg-elevated hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
        <Button className="mt-3" variant="primary" size="sm" onClick={abrir}>
          Responder agora <ChevronRight size={14} />
        </Button>
      </section>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={pick.pergunta.pergunta}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvar} disabled={!opcaoEscolhida}>
              <Check size={14} /> Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {pick.pergunta.opcoes.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpcaoEscolhida(o.id)}
              className={
                'block w-full rounded-xl border p-3 text-left transition-colors ' +
                (opcaoEscolhida === o.id
                  ? 'border-indigo bg-indigo/10'
                  : 'border-line bg-surface hover:border-indigo/50')
              }
            >
              <div className="text-sm font-medium text-ink">{o.label}</div>
            </button>
          ))}
          {pick.pergunta.permiteExtra && (
            <div className="pt-2">
              <Input
                placeholder="Quer detalhar mais? (opcional)"
                value={textoExtra}
                onChange={(e) => setTextoExtra(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
