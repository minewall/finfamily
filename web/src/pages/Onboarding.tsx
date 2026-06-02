// Onboarding wizard — porte do onboarding.html do Dino pra React.
// 9 steps: welcome → nome → objetivo → família → renda → sentimento → risco → valor → done.
// Ao final, alimenta o ICP automaticamente via completeOnboarding() (Opção B).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import {
  ONBOARDING_STEPS,
  OBJETIVO_LABELS,
  FAMILIA_LABELS,
  RENDA_LABELS,
  SENTIMENTO_LABELS,
  RISCO_LABELS,
  VALOR_LABELS,
  type OnboardingAnswers,
  type OnboardingObjetivo,
  type OnboardingFamilia,
  type OnboardingRenda,
  type OnboardingSentimento,
  type OnboardingRisco,
  type OnboardingValor,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export default function Onboarding() {
  const navigate = useNavigate()
  const { data, loading, load, getOnboarding, setOnboardingAnswer, pauseOnboarding, completeOnboarding } = useData()

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  // Posição inicial: pausedAtStep do blob (ou 0)
  const [stepIdx, setStepIdx] = useState<number>(() => getOnboarding().pausedAtStep ?? 0)
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => getOnboarding().answers ?? {})

  // Se já completou, mandar pro home
  useEffect(() => {
    if (data && getOnboarding().completed) navigate('/', { replace: true })
  }, [data, getOnboarding, navigate])

  const step = ONBOARDING_STEPS[stepIdx]
  const total = ONBOARDING_STEPS.length

  function update(key: keyof OnboardingAnswers, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setOnboardingAnswer(key, value)
  }

  function next() {
    if (stepIdx >= total - 1) return
    setStepIdx(stepIdx + 1)
  }

  function back() {
    if (stepIdx === 0) return
    setStepIdx(stepIdx - 1)
  }

  function pular() {
    // No step de renda, "pular" marca prefiro_nao
    if (step.id === 'renda') {
      update('renda', 'prefiro_nao')
    }
    next()
  }

  function pausar() {
    pauseOnboarding(stepIdx)
    navigate('/', { replace: true })
  }

  function finalizar() {
    completeOnboarding(answers)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-indigo/8 via-bg to-teal/5 px-5 py-6">
      {/* Progress */}
      <header className="mx-auto w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-xs text-mist">
          <span>Passo {stepIdx + 1} de {total}</span>
          {step.id !== 'welcome' && step.id !== 'done' && (
            <button type="button" onClick={pausar} className="text-faint hover:text-mist">
              Continuar depois
            </button>
          )}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full bg-gradient-to-r from-indigo to-teal transition-all duration-300"
            style={{ width: `${((stepIdx) / (total - 1)) * 100}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
        <div key={step.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl">{step.title}</h1>
          {step.subtitle && <p className="mt-2 text-sm text-mist">{step.subtitle}</p>}

          <div className="mt-8">
            {step.id === 'welcome' && (
              <div>
                <p className="text-base leading-relaxed text-ink">
                  O Haile é uma inteligência financeira pra famílias modernas. Ao invés de só
                  registrar gastos, ele te ajuda a tomar decisões — porque conhece sua realidade.
                </p>
                <p className="mt-4 text-base leading-relaxed text-mist">
                  Antes de começar, 4 perguntas rápidas pra ele saber o básico sobre você.
                </p>
              </div>
            )}

            {step.id === 'nome' && (
              <div>
                <Input
                  autoFocus
                  type="text"
                  maxLength={40}
                  placeholder="Seu nome ou apelido"
                  value={(answers.nome as string) ?? ''}
                  onChange={(e) => update('nome', e.target.value)}
                  className="text-lg"
                />
                <p className="mt-2 text-xs text-faint">É como o Haile vai se referir a você.</p>
              </div>
            )}

            {step.id === 'objetivo' && (
              <CardGroup
                value={answers.objetivo}
                onChange={(v) => { update('objetivo', v); setTimeout(next, 250) }}
                options={[
                  { id: 'dividas',  label: 'Quitar dívidas',      desc: 'Sair do vermelho e respirar' },
                  { id: 'reserva',  label: 'Construir reserva',   desc: 'Ter um colchão de segurança' },
                  { id: 'investir', label: 'Investir',            desc: 'Fazer o dinheiro trabalhar' },
                  { id: 'sonho',    label: 'Conquistar um sonho', desc: 'Imóvel, viagem, negócio…' },
                ]}
              />
            )}

            {step.id === 'familia' && (
              <CardGroup
                value={answers.familia}
                onChange={(v) => { update('familia', v); setTimeout(next, 250) }}
                options={[
                  { id: 'solo',   label: 'Só eu',              desc: 'Decido sozinho(a) minhas finanças' },
                  { id: 'casal',  label: 'Eu e meu cônjuge',   desc: 'Decisões compartilhadas a dois' },
                  { id: 'filhos', label: 'Família',            desc: 'Cônjuge, filhos e quem mais entra' },
                ]}
              />
            )}

            {step.id === 'renda' && (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(RENDA_LABELS) as OnboardingRenda[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { update('renda', id); setTimeout(next, 250) }}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-colors',
                      answers.renda === id
                        ? 'border-indigo bg-indigo/15 text-indigo'
                        : 'border-line bg-surface text-mist hover:border-indigo/50 hover:text-ink',
                    )}
                  >
                    {RENDA_LABELS[id]}
                  </button>
                ))}
              </div>
            )}

            {step.id === 'sentimento' && (
              <CardGroup
                value={answers.sentimento}
                onChange={(v) => { update('sentimento', v); setTimeout(next, 250) }}
                options={[
                  { id: 'tranquilo',  label: 'Tranquilo(a)',     desc: 'Está sob controle' },
                  { id: 'preocupado', label: 'Preocupado(a)',    desc: 'Sinto que poderia ir melhor' },
                  { id: 'ansioso',    label: 'Ansioso(a)',       desc: 'Falta clareza ou sobra' },
                  { id: 'sem_pensar', label: 'Não penso muito',  desc: 'Prefiro evitar o assunto' },
                ]}
              />
            )}

            {step.id === 'risco' && (
              <CardGroup
                value={answers.risco}
                onChange={(v) => { update('risco', v); setTimeout(next, 250) }}
                options={[
                  { id: 'conservador', label: 'Conservador(a)', desc: 'Segurança em primeiro' },
                  { id: 'moderado',    label: 'Moderado(a)',    desc: 'Aceito risco em parte' },
                  { id: 'arrojado',    label: 'Arrojado(a)',    desc: 'Busco retorno alto' },
                  { id: 'depende',     label: 'Depende',        desc: 'Varia conforme o momento' },
                ]}
              />
            )}

            {step.id === 'valor' && (
              <CardGroup
                value={answers.valor}
                onChange={(v) => { update('valor', v); setTimeout(next, 250) }}
                options={[
                  { id: 'experiencias', label: 'Experiências', desc: 'Viagens, vivências' },
                  { id: 'familia',      label: 'Família',      desc: 'Educação e qualidade de vida deles' },
                  { id: 'futuro',       label: 'Futuro',       desc: 'Aposentadoria, segurança' },
                  { id: 'sucesso',      label: 'Crescimento',  desc: 'Pessoal ou de negócio' },
                ]}
              />
            )}

            {step.id === 'done' && (
              <div className="space-y-4">
                <p className="text-base leading-relaxed text-ink">
                  Pronto, {(answers.nome as string) || 'amigo(a)'}. O Haile já tem o ponto de partida —
                  e vai te conhecer mais conforme você usar.
                </p>
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-indigo">Resumo</h3>
                  <dl className="space-y-2 text-sm">
                    <DlRow label="Nome" value={(answers.nome as string) || '—'} />
                    <DlRow label="Prioridade" value={answers.objetivo ? OBJETIVO_LABELS[answers.objetivo as OnboardingObjetivo] : '—'} />
                    <DlRow label="Família" value={answers.familia ? FAMILIA_LABELS[answers.familia as OnboardingFamilia] : '—'} />
                    <DlRow label="Renda mensal" value={answers.renda ? RENDA_LABELS[answers.renda as OnboardingRenda] : '—'} />
                    <DlRow label="Sentimento" value={answers.sentimento ? SENTIMENTO_LABELS[answers.sentimento as OnboardingSentimento] : '—'} />
                    <DlRow label="Perfil de risco" value={answers.risco ? RISCO_LABELS[answers.risco as OnboardingRisco] : '—'} />
                    <DlRow label="Onde investir" value={answers.valor ? VALOR_LABELS[answers.valor as OnboardingValor] : '—'} />
                  </dl>
                </div>
                <p className="text-xs text-mist">
                  Você pode ajustar qualquer dessas respostas (e responder muito mais) em <strong>Configurações → Contexto Pessoal</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Botões inferiores */}
          <div className="mt-10 flex items-center justify-between">
            <div>
              {stepIdx > 0 && step.id !== 'done' && (
                <Button variant="ghost" onClick={back}>
                  <ChevronLeft size={14} /> Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step.id === 'renda' && (
                <Button variant="ghost" onClick={pular}>Pular</Button>
              )}
              {step.id === 'welcome' && (
                <Button variant="primary" onClick={next}>
                  Vamos começar <ChevronRight size={14} />
                </Button>
              )}
              {step.id === 'nome' && (
                <Button
                  variant="primary"
                  onClick={next}
                  disabled={!((answers.nome as string) || '').trim()}
                >
                  Continuar <ChevronRight size={14} />
                </Button>
              )}
              {step.id === 'done' && (
                <Button variant="primary" onClick={finalizar}>
                  <Check size={14} /> Entrar no Haile
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function CardGroup<T extends string>({
  value, onChange, options,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: Array<{ id: T; label: string; desc: string }>
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-2xl border p-4 text-left transition-colors',
            value === o.id
              ? 'border-indigo bg-indigo/10'
              : 'border-line bg-surface hover:border-indigo/50',
          )}
        >
          <div className="text-[15px] font-bold text-ink">{o.label}</div>
          <div className="mt-0.5 text-[11.5px] text-mist">{o.desc}</div>
        </button>
      ))}
    </div>
  )
}

function DlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  )
}
