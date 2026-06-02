// Contexto Pessoal — Sprint 6.
// Tela onde o usuário vê o ICP, responde perguntas e ajusta respostas.
// Cada pergunta respondida sobe o % de conhecimento que o Coach tem
// dele, e isso muda como o Haile responde no chat.

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ChevronRight, Check, Edit3, X } from 'lucide-react'
import {
  CONTEXTO_CATEGORIES,
  PERGUNTAS_BANCO,
  calculateICP,
  getContextoLevel,
  getContextoNextLevel,
  perguntasPendentes,
  getRespostas,
  type ContextoState,
  type PerguntaSpec,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/field'

export default function ContextoPessoal() {
  const { data, loading, load, getContexto, addContextoResposta, removeContextoResposta } = useData()
  const [catSelecionada, setCatSelecionada] = useState<string | null>(null)
  const [perguntaAtiva, setPerguntaAtiva] = useState<PerguntaSpec | null>(null)
  const [opcaoEscolhida, setOpcaoEscolhida] = useState<string>('')
  const [textoExtra, setTextoExtra] = useState<string>('')

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const ctx: ContextoState = data ? getContexto() : {}
  const icp = calculateICP(ctx)
  const level = getContextoLevel(icp)
  const next = getContextoNextLevel(icp)

  const catComContagem = useMemo(() => {
    return CONTEXTO_CATEGORIES.map((cat) => {
      const r = ctx[cat.id]?.respostas ?? []
      return {
        ...cat,
        answered: Math.min(r.length, cat.total),
        pct: Math.round((Math.min(r.length, cat.total) / cat.total) * 100),
      }
    })
  }, [ctx])

  const pendentesPorCategoria = useMemo(() => {
    const m: Record<string, PerguntaSpec[]> = {}
    for (const cat of CONTEXTO_CATEGORIES) {
      m[cat.id] = perguntasPendentes(ctx, cat.id)
    }
    return m
  }, [ctx])

  // Próxima pergunta sugerida globalmente (qualquer categoria)
  const sugerida = useMemo(() => {
    const pendentes = perguntasPendentes(ctx)
    return pendentes[0] ?? null
  }, [ctx])

  function abrirPergunta(p: PerguntaSpec, respostaAtual?: { opcaoId?: string | null; extra?: string }) {
    setPerguntaAtiva(p)
    setOpcaoEscolhida(respostaAtual?.opcaoId ?? '')
    setTextoExtra(respostaAtual?.extra ?? '')
  }

  function salvarResposta() {
    if (!perguntaAtiva) return
    const opcao = perguntaAtiva.opcoes.find((o) => o.id === opcaoEscolhida)
    if (!opcao) return
    addContextoResposta(perguntaAtiva.categoria, {
      perguntaId: perguntaAtiva.id,
      pergunta: perguntaAtiva.pergunta,
      resposta: opcao.label,
      opcaoId: opcao.id,
      extra: textoExtra,
    })
    setPerguntaAtiva(null)
    setOpcaoEscolhida('')
    setTextoExtra('')
  }

  function removerResposta(p: PerguntaSpec) {
    if (!confirm(`Remover sua resposta de "${p.pergunta}"?`)) return
    removeContextoResposta(p.categoria, p.id)
  }

  if (loading && !data) {
    return <div className="mx-auto max-w-4xl px-5 py-8 text-mist">Carregando…</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo">
          <Sparkles size={14} /> Contexto Pessoal
        </div>
        <h1 className="mt-1 text-2xl font-bold text-ink">Quanto o Haile te conhece</h1>
        <p className="text-sm text-mist">
          Quanto mais ele souber sobre você, mais personalizadas ficam as orientações no chat.
          Suas respostas são privadas e só alimentam o Haile.
        </p>
      </header>

      {/* Hero ICP */}
      <section className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-indigo/15 via-bg to-teal/10 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: level.color }}>
              {level.name}
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold text-ink">{icp}%</div>
            <div className="mt-1 text-xs text-mist">{level.desc}</div>
          </div>
          {next && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Próximo</div>
              <div className="mt-0.5 text-sm font-medium" style={{ color: next.color }}>{next.name}</div>
              <div className="text-[10px] text-faint">a partir de {next.min}%</div>
            </div>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${icp}%`, background: `linear-gradient(90deg, ${level.color} 0%, ${next?.color ?? level.color} 100%)` }}
          />
        </div>
      </section>

      {/* Próxima pergunta sugerida */}
      {sugerida && (
        <section className="mb-6 rounded-2xl border border-indigo/50 bg-indigo/8 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">Próxima pergunta</div>
          <h3 className="mt-1 text-lg font-bold text-ink">{sugerida.pergunta}</h3>
          <Button className="mt-3" variant="primary" size="sm" onClick={() => abrirPergunta(sugerida)}>
            Responder agora <ChevronRight size={14} />
          </Button>
        </section>
      )}

      {/* Categorias */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Categorias</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {catComContagem.map((cat) => {
          const pend = pendentesPorCategoria[cat.id]?.length ?? 0
          const respostas = getRespostas(ctx, cat.id)
          const selected = catSelecionada === cat.id
          return (
            <article
              key={cat.id}
              className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-indigo/50"
            >
              <header className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-bold text-ink">{cat.name}</div>
                  <div className="text-[11px] text-faint">{cat.desc}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold" style={{ color: cat.color }}>{cat.pct}%</div>
                  <div className="text-[10px] text-faint">{cat.answered}/{cat.total}</div>
                </div>
              </header>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
                <div className="h-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pend > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const p = pendentesPorCategoria[cat.id]?.[0]
                      if (p) abrirPergunta(p)
                    }}
                  >
                    Responder {pend} {pend === 1 ? 'pendente' : 'pendentes'}
                  </Button>
                )}
                {respostas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCatSelecionada(selected ? null : cat.id)}
                    className="text-[11px] text-mist hover:text-ink"
                  >
                    {selected ? 'Esconder respostas' : `Ver ${respostas.length} ${respostas.length === 1 ? 'resposta' : 'respostas'}`}
                  </button>
                )}
              </div>

              {selected && respostas.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-line pt-3">
                  {respostas.map((r) => {
                    const pSpec = PERGUNTAS_BANCO.find((x) => x.id === r.perguntaId)
                    return (
                      <li key={r.perguntaId} className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-faint">{r.pergunta}</div>
                          <div className="text-[13px] font-medium text-ink">{r.resposta}</div>
                          {r.extra && <div className="text-[11px] italic text-mist">{r.extra}</div>}
                        </div>
                        <div className="flex gap-1">
                          {pSpec && (
                            <button
                              type="button"
                              onClick={() => abrirPergunta(pSpec, { opcaoId: r.opcaoId, extra: r.extra })}
                              className="rounded p-1 text-mist hover:bg-elevated hover:text-ink"
                              aria-label="Editar"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => pSpec && removerResposta(pSpec)}
                            className="rounded p-1 text-mist hover:bg-elevated hover:text-red"
                            aria-label="Remover"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          )
        })}
      </div>

      {/* Modal de pergunta */}
      <Modal
        open={!!perguntaAtiva}
        onClose={() => setPerguntaAtiva(null)}
        title={perguntaAtiva?.pergunta ?? ''}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPerguntaAtiva(null)}>Cancelar</Button>
            <Button variant="primary" onClick={salvarResposta} disabled={!opcaoEscolhida}>
              <Check size={14} /> Salvar
            </Button>
          </>
        }
      >
        {perguntaAtiva && (
          <div className="space-y-2">
            {perguntaAtiva.opcoes.map((o) => (
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
            {perguntaAtiva.permiteExtra && (
              <div className="pt-2">
                <Input
                  placeholder="Quer detalhar mais? (opcional)"
                  value={textoExtra}
                  onChange={(e) => setTextoExtra(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
