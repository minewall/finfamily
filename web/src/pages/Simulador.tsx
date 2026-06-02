import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, RotateCcw, Sparkles, PlusCircle, ExternalLink, Wand2 } from 'lucide-react'
import { FLUXOS, fluxoById, type FluxoSpec, type FieldSpec, type ResultBlock, type FluxoCtx } from '@haile/shared'
import { currencyBRL } from '@haile/shared'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { useCoach } from '@/store/useCoach'
import { useData } from '@/store/useData'
import { cn } from '@/lib/utils'

type View =
  | { kind: 'list' }
  | { kind: 'flow'; fluxoId: string; stepIdx: number; values: Record<string, unknown>; errors: Record<string, string | null> }
  | { kind: 'result'; fluxoId: string; values: Record<string, unknown>; result: ResultBlock }

export default function Simulador() {
  const [view, setView] = useState<View>({ kind: 'list' })
  const openWithSeed = useCoach((s) => s.openWithSeed)
  const addMeta = useData((s) => s.addMeta)
  const data = useData((s) => s.data)
  const navigate = useNavigate()

  // Contexto financeiro pros defaults inteligentes dos campos. Recomputa só
  // quando data muda; mês/ano são do "agora".
  const ctx: FluxoCtx | undefined = data
    ? { data, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
    : undefined

  function start(fluxo: FluxoSpec) {
    const values: Record<string, unknown> = {}
    fluxo.steps[0].fields.forEach((f) => {
      if (f.defaultValue) values[f.id] = f.defaultValue(values, ctx)
    })
    setView({ kind: 'flow', fluxoId: fluxo.id, stepIdx: 0, values, errors: {} })
  }

  function next() {
    if (view.kind !== 'flow') return
    const fluxo = fluxoById(view.fluxoId)!
    const step = fluxo.steps[view.stepIdx]
    const errors: Record<string, string | null> = {}
    let hasErr = false
    for (const f of step.fields) {
      if (f.validate) {
        const e = f.validate(view.values[f.id], view.values)
        if (e) { errors[f.id] = e; hasErr = true }
      }
    }
    if (hasErr) { setView({ ...view, errors }); return }

    const nextIdx = view.stepIdx + 1
    if (nextIdx >= fluxo.steps.length) {
      const result = fluxo.compute(view.values, ctx)
      setView({ kind: 'result', fluxoId: view.fluxoId, values: view.values, result })
      return
    }
    // Pré-preenche defaults do próximo step (já considerando values atuais)
    const nextValues = { ...view.values }
    fluxo.steps[nextIdx].fields.forEach((f) => {
      if (f.defaultValue && nextValues[f.id] === undefined) {
        nextValues[f.id] = f.defaultValue(nextValues, ctx)
      }
    })
    setView({ ...view, stepIdx: nextIdx, values: nextValues, errors: {} })
  }

  function back() {
    if (view.kind !== 'flow') return
    if (view.stepIdx === 0) { setView({ kind: 'list' }); return }
    setView({ ...view, stepIdx: view.stepIdx - 1, errors: {} })
  }

  function adjust() {
    if (view.kind !== 'result') return
    setView({ kind: 'flow', fluxoId: view.fluxoId, stepIdx: 0, values: view.values, errors: {} })
  }

  function handleCta(action: string, payload?: unknown) {
    if (action === 'adjust') return adjust()
    if (action === 'create-meta') {
      const p = payload as { label: string; target: number; type: string }
      addMeta({ label: p.label, target: p.target, type: p.type, active: true } as Parameters<typeof addMeta>[0])
      alert('Meta criada! Veja em /metas.')
      return
    }
    if (action === 'ask-haile') {
      const p = payload as { prompt?: string }
      // Prompt entra direto no input do painel — usuário revisa e envia.
      openWithSeed(p?.prompt ?? 'Quero refinar a simulação que acabei de fazer.')
      return
    }
    if (action === 'navigate') {
      const path = typeof payload === 'string' ? payload : ''
      if (path) navigate(path)
      return
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      {view.kind === 'list' && <FluxosList onPick={start} />}
      {view.kind === 'flow' && (
        <FlowStep
          fluxo={fluxoById(view.fluxoId)!}
          stepIdx={view.stepIdx}
          values={view.values}
          errors={view.errors}
          ctx={ctx}
          onChange={(id, v) => setView({ ...view, values: { ...view.values, [id]: v }, errors: { ...view.errors, [id]: null } })}
          onNext={next}
          onBack={back}
        />
      )}
      {view.kind === 'result' && (
        <ResultView
          fluxo={fluxoById(view.fluxoId)!}
          values={view.values}
          result={view.result}
          onCta={handleCta}
          onRefine={() => openWithSeed(buildRefinePrompt(view.fluxoId, view.values, view.result))}
          onRestart={() => setView({ kind: 'list' })}
        />
      )}
    </div>
  )
}

function FluxosList({ onPick }: { onPick: (f: FluxoSpec) => void }) {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Simulador</h1>
        <p className="text-sm text-mist">
          Escolha uma pergunta e o Haile te guia até a decisão.
        </p>
      </header>

      <div className="space-y-3">
        {FLUXOS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition-colors hover:border-indigo hover:bg-elevated/40"
          >
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo/20 to-teal/20 text-indigo">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-ink">{f.question}</div>
              <div className="mt-0.5 text-xs text-mist">{f.description}</div>
            </div>
            <ChevronRight size={18} className="flex-shrink-0 text-faint transition-colors group-hover:text-indigo" />
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-faint">
        Mais fluxos chegando — sugira o seu pelo Haile.
      </p>
    </div>
  )
}

function FlowStep({
  fluxo, stepIdx, values, errors, ctx, onChange, onNext, onBack,
}: {
  fluxo: FluxoSpec
  stepIdx: number
  values: Record<string, unknown>
  errors: Record<string, string | null>
  ctx?: FluxoCtx
  onChange: (id: string, v: unknown) => void
  onNext: () => void
  onBack: () => void
}) {
  const step = fluxo.steps[stepIdx]
  const total = fluxo.steps.length
  return (
    <div>
      <header className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-ink" aria-label="Voltar">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">{fluxo.title}</div>
            <div className="text-xs text-mist">Passo {stepIdx + 1} de {total}</div>
          </div>
        </div>
        <h2 className="text-xl font-bold text-ink">{step.question}</h2>
        {step.hint && <p className="mt-1 text-sm text-mist">{step.hint}</p>}
      </header>

      <div className="space-y-4">
        {step.fields.filter((f) => !f.visibleIf || f.visibleIf(values)).map((f) => (
          <FieldRender key={f.id} field={f} value={values[f.id]} error={errors[f.id]} ctx={ctx} onChange={(v) => onChange(f.id, v)} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-1">
          {fluxo.steps.map((_, i) => (
            <div key={i} className={cn('h-1 w-8 rounded-full', i <= stepIdx ? 'bg-indigo' : 'bg-elevated')} />
          ))}
        </div>
        <Button onClick={onNext}>
          {stepIdx === total - 1 ? 'Ver resultado' : 'Continuar'} <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}

function FieldRender({ field, value, error, ctx, onChange }: { field: FieldSpec; value: unknown; error?: string | null; ctx?: FluxoCtx; onChange: (v: unknown) => void }) {
  const sufixo = field.kind === 'currency' ? 'R$' : field.kind === 'percent' ? '%' : field.kind === 'months' ? 'meses' : field.kind === 'years' ? 'anos' : ''
  const opts = field.kind === 'select'
    ? (field.optionsFn ? field.optionsFn(ctx) : (field.options ?? []))
    : []
  return (
    <Field label={field.label} hint={error ?? field.hint}>
      {field.kind === 'select' ? (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      ) : (
        <div className="relative">
          <Input
            type={field.kind === 'text' ? 'text' : 'number'}
            inputMode="decimal"
            step={field.kind === 'percent' ? '0.01' : field.kind === 'currency' ? '0.01' : '1'}
            value={value == null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            className={cn(error && 'border-red focus:border-red', sufixo && 'pr-12')}
          />
          {sufixo && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-faint">
              {sufixo}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}

// Prompt template por fluxo. Cita números concretos pro Haile ter contexto.
function buildRefinePrompt(fluxoId: string, values: Record<string, unknown>, result: ResultBlock): string {
  const n = (k: string) => Number(values[k]) || 0
  if (fluxoId === 'reserva') {
    const alvo = currencyBRL(n('alvo'))
    const meses = Math.round(n('meses'))
    const aporte = result.metrics?.find((m) => m.label === 'Aporte mensal')?.value ?? '—'
    return `Acabei de simular criar uma reserva de ${alvo} em ${meses} meses com aporte de ${aporte}/mês. Faz sentido pra meu momento? Tem alguma sugestão de ajuste?`
  }
  if (fluxoId === 'aposentadoria') {
    const idadeAlvo = Math.round(n('idadeAlvoVal'))
    const renda = currencyBRL(n('rendaMensal'))
    const aporte = result.metrics?.find((m) => m.label === 'Aporte mensal')?.value ?? '—'
    return `Simulei me aposentar aos ${idadeAlvo} anos com renda de ${renda}/mês. Aportando ${aporte}/mês a partir de agora. Esse plano é realista pro meu perfil? O que eu poderia melhorar?`
  }
  if (fluxoId === 'veiculo') {
    const preco = currencyBRL(n('precoCarro'))
    const aluguel = currencyBRL(n('mensalidadeAluguel'))
    const tcoCompra = result.metrics?.find((m) => m.label === 'TCO Comprar')?.value ?? '—'
    const tcoAlugar = result.metrics?.find((m) => m.label === 'TCO Alugar')?.value ?? '—'
    return `Simulei comprar × alugar um carro de ${preco} (assinatura ${aluguel}/mês). TCO comprar: ${tcoCompra}, TCO alugar: ${tcoAlugar}. Vale a pena no meu caso? Considere meu Poder de Escolha e composição familiar.`
  }
  if (fluxoId === 'renda-fixa') {
    const valor = currencyBRL(n('valorAplicado'))
    const meses = Math.round(n('meses'))
    const vencedor = result.metrics?.find((m) => m.label === '1º lugar')?.value ?? '—'
    return `Comparei ${valor} em CDB vs LCI/LCA vs Tesouro Selic por ${meses} meses — ${vencedor} ganhou. Qual encaixa melhor no meu perfil de risco e liquidez?`
  }
  return `Acabei de fazer a simulação "${fluxoById(fluxoId)?.title ?? fluxoId}". ${result.headline} Pode revisar e sugerir ajustes pro meu contexto?`
}

function ResultView({ fluxo, values, result, onCta, onRefine, onRestart }: { fluxo: FluxoSpec; values: Record<string, unknown>; result: ResultBlock; onCta: (a: string, p?: unknown) => void; onRefine: () => void; onRestart: () => void }) {
  // values é usado pelo buildRefinePrompt no parent; mantido aqui pra futura exibição de resumo.
  void values
  return (
    <div>
      <header className="mb-5">
        <button type="button" onClick={onRestart} className="mb-3 inline-flex items-center gap-1 text-xs text-mist hover:text-ink">
          <RotateCcw size={12} /> escolher outra pergunta
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo">{fluxo.title}</div>
        <h2 className="mt-1 text-xl font-bold text-ink">{result.headline}</h2>
      </header>

      {result.metrics && result.metrics.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {result.metrics.map((m, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{m.label}</div>
              <div className={cn(
                'mt-1 font-mono text-lg font-extrabold',
                m.tone === 'pos' && 'text-green',
                m.tone === 'neg' && 'text-red',
                (!m.tone || m.tone === 'neutral') && 'text-ink',
              )}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {result.details.length > 0 && (
        <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
          <ul className="space-y-2 text-sm text-ink">
            {result.details.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {result.ctas?.filter((c) => c.action !== 'ask-haile').map((c, i) => {
          const isPrimary = i === 0
          const icon = c.action === 'create-meta' ? <PlusCircle size={14} />
                     : c.action === 'adjust' ? <RotateCcw size={14} />
                     : c.action === 'navigate' ? <ExternalLink size={14} />
                     : null
          return (
            <Button key={`cta-${i}`} variant={isPrimary ? 'primary' : 'outline'} size="sm" onClick={() => onCta(c.action, c.payload)}>
              {icon} {c.label}
            </Button>
          )
        })}
        <Button variant="outline" size="sm" onClick={onRefine} className="border-indigo/40 text-indigo hover:bg-indigo/5">
          <Wand2 size={14} /> Refinar com Haile
        </Button>
      </div>
    </div>
  )
}
