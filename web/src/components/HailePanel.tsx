import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, X, Trash2 } from 'lucide-react'
import { buildCoachSystemPrompt } from '@haile/shared'
import { askCoach } from '@/lib/coach'
import { formatCoachToHtml } from '@/lib/format-coach'
import { useCoach } from '@/store/useCoach'
import { useData } from '@/store/useData'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Qual meu maior gasto esse mês?',
  'Onde meu dinheiro está indo?',
  'Como melhorar meu Poder de Escolha?',
  'Como está minha saúde financeira?',
]

export function HailePanel() {
  const { open, history, loading, error, usage, setOpen, appendUser, appendAssistant, setLoading, setError, setUsage, reset } = useCoach()
  const data = useData((s) => s.data)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // auto-scroll ao chegar nova mensagem
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [history, loading])

  async function send(text: string) {
    const t = text.trim()
    if (!t || loading) return
    setError(null)
    setInput('')
    appendUser(t)
    setLoading(true)
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const system = buildCoachSystemPrompt(data ?? {}, month, year)
      // Constrói messages incluindo a nova mensagem do user (history ainda
      // não reflete via closure — pegamos do estado snapshot)
      const snapshot = useCoach.getState().history
      const result = await askCoach({ system, messages: snapshot })
      appendAssistant(result.text || '(sem resposta)')
      if (result.usage) setUsage(result.usage)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao falar com o Haile.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const showUsage = usage && (usage.tier === 'free' || usage.tier === 'plus') && usage.pct >= 50

  return (
    <>
      {/* Backdrop só no mobile (drawer ocupa tela) */}
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
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[11px] font-bold text-white">
              H
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Haile</div>
              <div className="text-[10.5px] text-mist">
                {loading ? 'Pensando…' : 'Inteligência financeira'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {history.length === 0 && !loading && (
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-white font-bold">
                H
              </div>
              <p className="text-sm text-mist">
                Olá! Sou o Haile. Tenho acesso ao seu histórico financeiro deste mês.
                Posso te ajudar a entender, decidir e planejar.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs text-mist transition-colors hover:border-indigo hover:bg-elevated hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-3">
              {history.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2',
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  {m.role === 'assistant' && (
                    <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[10px] font-bold text-white">
                      H
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-indigo text-white rounded-tr-sm'
                        : 'bg-elevated text-ink rounded-tl-sm',
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <div
                        className="coach-content"
                        dangerouslySetInnerHTML={{ __html: formatCoachToHtml(m.content) }}
                      />
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo to-teal text-[10px] font-bold text-white">
                    H
                  </div>
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
                <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Medidor de uso (só free/plus >=50%) */}
        {showUsage && (
          <div className="border-t border-line bg-sidebar px-4 py-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
              <div
                className={cn(
                  'h-full rounded-full',
                  usage.pct >= 100 ? 'bg-red' : usage.pct >= 80 ? 'bg-amber' : 'bg-indigo',
                )}
                style={{ width: `${Math.min(100, usage.pct)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-mist">
              <span>
                {usage.pct >= 100 ? 'Limite mensal atingido' : `${usage.pct}% do limite mensal do Haile`}
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={onSubmit} className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Pergunte ao Haile…"
              rows={1}
              className="flex-1 resize-none rounded-lg border border-line-2 bg-elevated px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-indigo"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-indigo text-white hover:bg-indigo-deep disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
