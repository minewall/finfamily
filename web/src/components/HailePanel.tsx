import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, X, Trash2 } from 'lucide-react'
import {
  buildCoachSystemPrompt,
  COACH_TOOLS,
  SKIP_CONFIRM,
  type CoachToolName,
} from '@haile/shared'
import { askCoachRaw, type ContentBlock, type CoachMessage } from '@/lib/coach'
import { runCoachTool } from '@/lib/coach-handlers'
import { formatCoachToHtml } from '@/lib/format-coach'
import { useCoach, newTurnId, type Turn } from '@/store/useCoach'
import { useData } from '@/store/useData'
import { ToolConfirmCard } from '@/components/ToolConfirmCard'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Qual meu maior gasto esse mês?',
  'Onde meu dinheiro está indo?',
  'Lança uma despesa de R$ 50 de mercado hoje',
  'Como melhorar meu Poder de Escolha?',
]

const MAX_LOOPS = 6 // proteção contra loop infinito

export function HailePanel() {
  const {
    open, turns, rawHistory, loading, error, usage,
    setOpen, appendTurn, resolveToolPending, pushRaw, setLoading, setError, setUsage, reset,
  } = useCoach()
  const data = useData((s) => s.data)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [turns, loading])

  // Pede confirmação ao usuário; resolve com 'confirm'|'cancel' quando ele clica.
  // Pendurar a Promise num "registry" e clicar no card resolve.
  const pendingResolvers = useRef(new Map<string, (v: 'confirm' | 'cancel') => void>())
  function awaitConfirm(tool_use_id: string): Promise<'confirm' | 'cancel'> {
    return new Promise((resolve) => {
      pendingResolvers.current.set(tool_use_id, resolve)
    })
  }
  function resolveConfirm(tool_use_id: string, answer: 'confirm' | 'cancel') {
    const r = pendingResolvers.current.get(tool_use_id)
    if (r) { pendingResolvers.current.delete(tool_use_id); r(answer) }
  }

  // ── Loop de turno ────────────────────────────────────────────────
  // Continua chamando o proxy enquanto vier stop_reason='tool_use'.
  // Cada round: render dos text blocks, pra cada tool_use → confirm card
  // (ou pula se SKIP_CONFIRM), executa handler, monta tool_results, push.
  async function runTurn(initial: CoachMessage[]) {
    setLoading(true)
    setError(null)
    try {
      let messages = initial
      const now = new Date()
      const system = buildCoachSystemPrompt(data ?? {}, now.getMonth() + 1, now.getFullYear())

      for (let loop = 0; loop < MAX_LOOPS; loop++) {
        const r = await askCoachRaw({ system, messages, tools: COACH_TOOLS as unknown as Record<string, unknown>[] })
        if (r.usage) setUsage(r.usage)

        // Empurra o assistant message no histórico bruto (com TODOS os blocks
        // — inclui tool_use, pra o próximo round pareiar tool_use_id).
        const assistantMsg: CoachMessage = { role: 'assistant', content: r.blocks }
        pushRaw(assistantMsg)
        messages = [...messages, assistantMsg]

        // Renderiza text blocks como bolhas
        for (const b of r.blocks) {
          if (b.type === 'text' && b.text.trim()) {
            appendTurn({ id: newTurnId(), kind: 'assistant-text', text: b.text })
          }
        }

        // Pega tool_use blocks
        const toolUses = r.blocks.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
        if (toolUses.length === 0 || r.stop_reason !== 'tool_use') break

        // Pra cada tool_use: confirm (se preciso) → executa → coleta resultado
        const toolResults: ContentBlock[] = []
        for (const tu of toolUses) {
          const name = tu.name as CoachToolName
          const needsConfirm = !SKIP_CONFIRM.has(name)

          let answer: 'confirm' | 'cancel' = 'confirm'
          if (needsConfirm) {
            // Renderiza card pendente
            appendTurn({
              id: newTurnId(), kind: 'tool-pending',
              tool_use_id: tu.id, name, input: tu.input,
            })
            answer = await awaitConfirm(tu.id)
          }

          if (answer === 'cancel') {
            resolveToolPending(tu.id, { id: newTurnId(), kind: 'tool-cancelled', name, input: tu.input })
            toolResults.push({
              type: 'tool_result', tool_use_id: tu.id, is_error: true,
              content: 'Usuário cancelou esta ação. Não tente repetir sem nova instrução.',
            })
          } else {
            const result = runCoachTool(name, tu.input)
            resolveToolPending(tu.id, {
              id: newTurnId(), kind: 'tool-done',
              name, input: tu.input, summary: result.summary, isError: result.isError,
            })
            toolResults.push({
              type: 'tool_result', tool_use_id: tu.id,
              is_error: result.isError, content: result.content,
            })
          }
        }

        // Empurra os tool_results como user message e continua o loop
        const userToolMsg: CoachMessage = { role: 'user', content: toolResults }
        pushRaw(userToolMsg)
        messages = [...messages, userToolMsg]
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao falar com o Haile.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    setInput('')
    appendTurn({ id: newTurnId(), kind: 'user-text', text: t })
    const userMsg: CoachMessage = { role: 'user', content: t }
    pushRaw(userMsg)
    await runTurn([...rawHistory, userMsg])
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); void send(input) }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) }
  }

  const showUsage = usage && (usage.tier === 'free' || usage.tier === 'plus') && usage.pct >= 50

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-line bg-sidebar transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[11px] font-bold text-white">H</div>
            <div>
              <div className="text-sm font-bold text-ink">Haile</div>
              <div className="text-[10.5px] text-mist">{loading ? 'Pensando…' : 'Inteligência financeira'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {turns.length > 0 && (
              <button type="button" onClick={reset} className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink" aria-label="Limpar conversa" title="Limpar conversa">
                <Trash2 size={14} />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {turns.length === 0 && !loading && (
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-white font-bold">H</div>
              <p className="text-sm text-mist">
                Olá! Sou o Haile. Posso analisar seus dados, e agora também criar/editar lançamentos com sua confirmação.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs text-mist transition-colors hover:border-indigo hover:bg-elevated hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.length > 0 && (
            <div className="space-y-3">
              {turns.map((t) => <TurnView key={t.id} turn={t} onResolve={resolveConfirm} />)}
              {loading && (
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
              {error && (
                <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">{error}</div>
              )}
            </div>
          )}
        </div>

        {showUsage && (
          <div className="border-t border-line bg-sidebar px-4 py-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
              <div className={cn('h-full rounded-full', usage.pct >= 100 ? 'bg-red' : usage.pct >= 80 ? 'bg-amber' : 'bg-indigo')} style={{ width: `${Math.min(100, usage.pct)}%` }} />
            </div>
            <div className="mt-1 text-[10.5px] text-mist">
              {usage.pct >= 100 ? 'Limite mensal atingido' : `${usage.pct}% do limite mensal do Haile`}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Pergunte ao Haile…" rows={1}
              className="flex-1 resize-none rounded-lg border border-line-2 bg-elevated px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-indigo"
              disabled={loading} />
            <button type="submit" disabled={!input.trim() || loading}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-indigo text-white hover:bg-indigo-deep disabled:opacity-50" aria-label="Enviar">
              <Send size={14} />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}

function TurnView({ turn, onResolve }: { turn: Turn; onResolve: (id: string, a: 'confirm' | 'cancel') => void }) {
  if (turn.kind === 'user-text') {
    return (
      <div className="flex flex-row-reverse gap-2">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-indigo px-3.5 py-2.5 text-sm leading-relaxed text-white">{turn.text}</div>
      </div>
    )
  }
  if (turn.kind === 'assistant-text') {
    return (
      <div className="flex gap-2">
        <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[10px] font-bold text-white">H</div>
        <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-elevated px-3.5 py-2.5 text-sm leading-relaxed text-ink">
          <div className="coach-content" dangerouslySetInnerHTML={{ __html: formatCoachToHtml(turn.text) }} />
        </div>
      </div>
    )
  }
  if (turn.kind === 'tool-pending') {
    return (
      <div className="ml-9 max-w-[85%]">
        <ToolConfirmCard
          kind="pending" name={turn.name} input={turn.input}
          onConfirm={() => onResolve(turn.tool_use_id, 'confirm')}
          onCancel={() => onResolve(turn.tool_use_id, 'cancel')}
        />
      </div>
    )
  }
  if (turn.kind === 'tool-done') {
    return (
      <div className="ml-9 max-w-[85%]">
        <ToolConfirmCard kind="done" name={turn.name} input={turn.input} summary={turn.summary} isError={turn.isError} />
      </div>
    )
  }
  if (turn.kind === 'tool-cancelled') {
    return (
      <div className="ml-9 max-w-[85%]">
        <ToolConfirmCard kind="cancelled" name={turn.name} input={turn.input} />
      </div>
    )
  }
  return null
}
