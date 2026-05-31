import { useState } from 'react'
import { ChevronRight, ChevronLeft, RotateCcw, Sparkles, PlusCircle } from 'lucide-react'
import { FLUXOS, fluxoById, type FluxoSpec, type FieldSpec, type ResultBlock } from '@haile/shared'
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
  const openHaile = useCoach((s) => s.setOpen)
  const addMeta = useData((s) => s.addMeta)

  function start(fluxo: FluxoSpec) {
    const values: Record<string, unknown> = {}
    fluxo.steps[0].fields.forEach((f) => {
      if (f.defaultValue) values[f.id] = f.defaultValue(values)
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
      const result = fluxo.compute(view.values)
      setView({ kind: 'result', fluxoId: view.fluxoId, values: view.values, result })
      return
    }
    // Pré-preenche defaults do próximo step (já considerando values atuais)
    const nextValues = { ...view.values }
    fluxo.steps[nextIdx].fields.forEach((f) => {
      if (f.defaultValue && nextValues[f.id] === undefined) {
        nextValues[f.id] = f.defaultValue(nextValues)
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
      openHaile(true)
      // Sem auto-send no momento — usuário cola o prompt
      if (p?.prompt) {
        navigator.clipboard.writeText(p.prompt).catch(() => {})
        alert('Prompt copiado pra área de transferência — cole no Haile.')
      }
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
          onChange={(id, v) => setView({ ...view, values: { ...view.values, [id]: v }, errors: { ...view.errors, [id]: null } })}
          onNext={next}
          onBack={back}
        />
      )}
      {view.kind === 'result' && (
        <ResultView
          fluxo={fluxoById(view.fluxoId)!}
          result={view.result}
          onCta={handleCta}
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
        Mais fluxos em breve: aposentadoria, comprar × alugar veículo, comparar renda fixa.
      </p>
    </div>
  )
}

function FlowStep({
  fluxo, stepIdx, values, errors, onChange, onNext, onBack,
}: {
  fluxo: FluxoSpec
  stepIdx: number
  values: Record<string, unknown>
  errors: Record<string, string | null>
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
          <FieldRender key={f.id} field={f} value={values[f.id]} error={errors[f.id]} onChange={(v) => onChange(f.id, v)} />
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

function FieldRender({ field, value, error, onChange }: { field: FieldSpec; value: unknown; error?: string | null; onChange: (v: unknown) => void }) {
  const sufixo = field.kind === 'currency' ? 'R$' : field.kind === 'percent' ? '%' : field.kind === 'months' ? 'meses' : field.kind === 'years' ? 'anos' : ''
  return (
    <Field label={field.label} hint={error ?? field.hint}>
      {field.kind === 'select' ? (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

function ResultView({ fluxo, result, onCta, onRestart }: { fluxo: FluxoSpec; result: ResultBlock; onCta: (a: string, p?: unknown) => void; onRestart: () => void }) {
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

      {result.ctas && result.ctas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.ctas.map((c, i) => {
            const isPrimary = i === 0
            const icon = c.action === 'create-meta' ? <PlusCircle size={14} />
                       : c.action === 'ask-haile' ? <Sparkles size={14} />
                       : c.action === 'adjust' ? <RotateCcw size={14} />
                       : null
            return (
              <Button key={i} variant={isPrimary ? 'primary' : 'outline'} size="sm" onClick={() => onCta(c.action, c.payload)}>
                {icon} {c.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
