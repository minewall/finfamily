// Takeover de 1º acesso — overlay central com saudação proativa + 4 chips
// pré-canned (respostas determinísticas, custo zero). Disparado pelo gate
// no AppShell quando: onboarding completo + zero dados + flag !dismissed.
//
// Respostas inline pra "O que faz" e "Como funciona" são curadas (sem
// chamar a IA). "Trazer dados" abre o paper-clip do Painel. "Tour" é
// chat-style sequencial. "Explorar sozinho" dispensa e seta a flag.
//
// Porta do Dino app/js/app.js (HAILE_FR_CHIPS / HAILE_FR_NODES / HAILE_TOUR_STEPS).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Paperclip, X } from 'lucide-react'
import { useCoach, newTurnId, type Turn } from '@/store/useCoach'
import { useData } from '@/store/useData'
import { useAuth } from '@/lib/auth'
import { formatCoachToHtml } from '@/lib/format-coach'
import { cn } from '@/lib/utils'

type ChipId = 'oque' | 'como' | 'dados' | 'tour' | 'lancamento' | 'depois'

interface Chip {
  label: string
  icon?: ReactNode
  action?: 'import' | 'tour' | 'lancamento' | 'dismiss'
}

const CHIPS: Record<ChipId, Chip> = {
  oque: { label: 'O que você pode fazer?' },
  como: { label: 'Como você funciona?' },
  dados: { label: 'Quero trazer meus dados', icon: <Paperclip size={14} />, action: 'import' },
  tour: { label: 'Me dá um tour', action: 'tour' },
  lancamento: { label: 'Criar meu primeiro lançamento', action: 'lancamento' },
  depois: { label: 'Prefiro explorar sozinho', action: 'dismiss' },
}

const NODES: Partial<Record<ChipId, { reply: string; chips: ChipId[] }>> = {
  oque: {
    reply: [
      'Posso te ajudar a enxergar e decidir melhor sobre o seu dinheiro:',
      '- Entender pra onde ele está indo — por categoria e por pessoa',
      '- Registrar receitas e despesas: você me conta, eu lanço',
      '- Acompanhar metas, patrimônio e compromissos',
      '- Simular cenários: aposentadoria, comprar × alugar carro, comparar renda fixa',
      '- Ler seus extratos e faturas e importar tudo de uma vez',
      '',
      'O jeito mais rápido de começar é me trazendo seus dados.',
    ].join('\n'),
    chips: ['dados', 'tour', 'como'],
  },
  como: {
    reply: [
      'Funciono junto com os seus dados, que ficam na sua conta. Cada conversa é processada com segurança e não treina o modelo.',
      '',
      'Quanto mais contexto você me dá — seus lançamentos, suas metas, o que importa pra você — mais útil eu fico.',
      '',
      'E você está sempre no comando: eu sugiro, você decide. Antes de qualquer mudança nos seus dados, eu peço sua confirmação.',
    ].join('\n'),
    chips: ['dados', 'tour', 'oque'],
  },
}

const TOUR_STEPS = [
  'Bora. Em quatro paradas rápidas você já pega o essencial.',
  '**1. Visão Geral** — seu retrato do mês: o que entrou, o que saiu e seu Poder de Escolha. Primeira tela ao abrir.',
  '**2. Lançamentos / Receitas / Despesas** — onde vivem as movimentações. Você adiciona na mão, ou me pede direto: "lança 80 de mercado hoje".',
  '**3. Contas, Metas, Patrimônio** — pra onde você quer chegar e o que já construiu. Eu acompanho o progresso com você.',
  '**4. Simulador** — testa decisões antes de tomar: quanto guardar pra reserva, comprar × alugar carro, qual renda fixa rende mais.',
  'É isso. Se você me trouxer seus dados agora, eu já te mostro tudo isso preenchido com a sua realidade.',
]

interface Bubble {
  kind: 'user' | 'assistant'
  text: string
}

export function HaileTakeover() {
  const open = useCoach((s) => s.takeoverOpen)
  const setTakeoverOpen = useCoach((s) => s.setTakeoverOpen)
  const setPanelOpen = useCoach((s) => s.setOpen)
  const appendTurn = useCoach((s) => s.appendTurn)
  const setFlag = useData((s) => s.setFlag)
  const { session } = useAuth()
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [activeChips, setActiveChips] = useState<ChipId[]>(['oque', 'como', 'dados', 'tour'])
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Saudação proativa quando abre
  useEffect(() => {
    if (!open) return
    const email = session?.user?.email ?? ''
    const nome = email.split('@')[0].split('.')[0]
    const cap = nome ? nome[0].toUpperCase() + nome.slice(1) : ''
    setBubbles([{
      kind: 'assistant',
      text: `Bom te conhecer${cap ? ', ' + cap : ''}. Eu sou o Haile, sua inteligência financeira. Penso junto com você sobre dinheiro — sem julgamento, com foco nas suas escolhas. Por onde quer começar?`,
    }])
    setActiveChips(['oque', 'como', 'dados', 'tour'])
    setTyping(false)
  }, [open, session])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [bubbles, typing])

  function dismiss() {
    setFlag('haileFirstRunDismissed', true)
    setTakeoverOpen(false)
  }

  function collapseIntoPanel() {
    // Empurra as bolhas do takeover pro Painel como turnos reais
    bubbles.forEach((b) => {
      appendTurn({
        id: newTurnId(),
        kind: b.kind === 'user' ? 'user-text' : 'assistant-text',
        text: b.text,
      } as Turn)
    })
    setTakeoverOpen(false)
    setPanelOpen(true)
  }

  async function onChip(id: ChipId) {
    const c = CHIPS[id]
    if (!c) return
    // Eco da escolha como bolha de user
    setBubbles((bs) => [...bs, { kind: 'user', text: c.label }])
    setActiveChips([])

    if (c.action === 'dismiss') {
      // microdelay pra ler o eco antes de fechar
      setTimeout(dismiss, 250)
      return
    }
    if (c.action === 'lancamento') {
      setBubbles((bs) => [...bs, { kind: 'assistant', text: 'Boa. Te levo até os Lançamentos — clica em adicionar, ou me chama a qualquer momento que eu lanço pra você.' }])
      setTimeout(() => {
        dismiss()
        window.location.hash = '#/lancamentos'
      }, 800)
      return
    }
    if (c.action === 'import') {
      setBubbles((bs) => [...bs, { kind: 'assistant', text: 'Perfeito. Vou abrir o Painel já com o paper-clip pronto — escolhe seu extrato (CSV/OFX/PDF) e eu organizo os lançamentos pra você.' }])
      setTimeout(() => {
        collapseIntoPanel()
        // Foca no Painel; usuário clica o paper-clip
      }, 1000)
      return
    }
    if (c.action === 'tour') {
      // Sequencial com typing
      for (let i = 0; i < TOUR_STEPS.length; i++) {
        setTyping(true)
        await wait(420)
        setTyping(false)
        setBubbles((bs) => [...bs, { kind: 'assistant', text: TOUR_STEPS[i] }])
        await wait(520)
      }
      // Final: chips de followup
      setActiveChips(['dados', 'lancamento', 'depois'])
      return
    }
    // Nós de texto pré-canned
    const node = NODES[id]
    if (!node) return
    setTyping(true)
    await wait(360)
    setTyping(false)
    setBubbles((bs) => [...bs, { kind: 'assistant', text: node.reply }])
    setActiveChips(node.chips)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
      <div className="relative flex w-full max-w-[680px] max-h-[88dvh] flex-col overflow-hidden rounded-3xl border border-line-2 bg-sidebar shadow-2xl shadow-black/50">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-xs font-bold text-white">H</div>
            <div>
              <div className="text-sm font-bold text-ink">Haile</div>
              <div className="text-[10.5px] text-mist">Inteligência financeira</div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          {bubbles.map((b, i) => (
            <div key={i} className={cn('flex gap-2', b.kind === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {b.kind === 'assistant' && (
                <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[10px] font-bold text-white">H</div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                b.kind === 'user' ? 'bg-indigo text-white rounded-tr-sm' : 'bg-elevated text-ink rounded-tl-sm',
              )}>
                {b.kind === 'assistant'
                  ? <div className="coach-content" dangerouslySetInnerHTML={{ __html: formatCoachToHtml(b.text) }} />
                  : b.text
                }
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-2">
              <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[10px] font-bold text-white">H</div>
              <div className="rounded-xl rounded-tl-sm bg-elevated px-3.5 py-2.5">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist" style={{ animationDelay: '240ms' }} />
                </span>
              </div>
            </div>
          )}

          {activeChips.length > 0 && !typing && (
            <div className="ml-9 flex flex-col gap-2 pt-1">
              {activeChips.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChip(id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:border-indigo hover:bg-elevated"
                >
                  {CHIPS[id].icon}
                  <span>{CHIPS[id].label}</span>
                </button>
              ))}
              {/* link discreto pra dispensar — só mostra na tela inicial */}
              {activeChips.includes('oque') && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="self-start text-xs text-faint underline-offset-2 hover:text-mist hover:underline mt-2"
                >
                  Prefiro explorar sozinho
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
