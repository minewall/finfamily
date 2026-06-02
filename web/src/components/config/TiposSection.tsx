import { useMemo, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Info } from 'lucide-react'
import { TIPOS_BUILTIN, type TipoDef } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

type EditState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; id: string }

const COMPORTAMENTOS: Array<{ id: string; label: string }> = [
  { id: 'essencial', label: 'Essencial — piso de sobrevivência' },
  { id: 'obrigatorio', label: 'Obrigatório — saída imposta' },
  { id: 'comprometido', label: 'Comprometido — cortar tem custo' },
  { id: 'opcional', label: 'Opcional — cortar é fácil' },
  { id: 'eventual', label: 'Eventual — não-mensal' },
]

interface CustomTipo {
  id: string
  label: string
  comportamento: string
  color: string
  builtin?: false
}

export function TiposSection() {
  const data = useData((s) => s.data)
  const addTipo = useData((s) => s.addTipo)
  const updateTipo = useData((s) => s.updateTipo)
  const deleteTipo = useData((s) => s.deleteTipo)

  const tiposCustom = useMemo<CustomTipo[]>(
    () => (data?.tiposCustom ?? []) as CustomTipo[],
    [data?.tiposCustom],
  )
  const builtins = TIPOS_BUILTIN

  const [editing, setEditing] = useState<EditState>(null)
  const [form, setForm] = useState({
    label: '',
    comportamento: 'opcional',
    color: '#22C55E',
  })
  const [error, setError] = useState<string | null>(null)

  function startCreate() {
    setEditing({ mode: 'create' })
    setForm({ label: '', comportamento: 'opcional', color: '#22C55E' })
    setError(null)
  }
  function startEditBuiltin(t: TipoDef) {
    // built-in só permite editar label + comportamento? Escopo: label + comportamento via custom.
    // Para builtin permitimos ajustar label/comportamento via override armazenado em tiposCustom com id igual ao do builtin (override).
    // Simpler aqui: built-in é read-only — exibe forma de override só pra label via labelOverride (futuro).
    // Por enquanto: aviso e nada mais.
    void t
  }
  function startEditCustom(t: CustomTipo) {
    setEditing({ mode: 'edit', id: t.id })
    setForm({ label: t.label, comportamento: t.comportamento, color: t.color })
    setError(null)
  }
  function cancel() {
    setEditing(null)
    setError(null)
  }
  function submit() {
    setError(null)
    try {
      if (!editing) return
      if (editing.mode === 'create') {
        addTipo({ label: form.label, comportamento: form.comportamento, color: form.color })
      } else {
        updateTipo(editing.id, {
          label: form.label,
          comportamento: form.comportamento,
          color: form.color,
        })
      }
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }
  function handleDelete(id: string) {
    const ok = window.confirm('Apagar este tipo? Categorias que usavam ele voltam pro tipo padrão.')
    if (!ok) return
    deleteTipo(id)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Tipos</h2>
        <p className="mt-1 text-sm text-mist">
          Os 5 tipos do Modelo Minewall classificam suas saídas pelo comportamento —
          essencial, obrigatório, comprometido, opcional e eventual. Você pode criar
          tipos extras se precisar de uma categoria mais fina.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Os 5 tipos padrão não podem ser apagados — eles são o motor do Poder de Escolha.
          Você pode criar novos tipos custom abaixo.
        </p>
      </div>

      {/* Built-in */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink">Tipos padrão</h3>
        <ul className="mt-4 space-y-2">
          {builtins.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-line-2 bg-bg px-3 py-3"
            >
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.label}</p>
                <p className="truncate text-xs text-mist">{t.desc}</p>
              </div>
              <span className="rounded-full border border-line-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                Padrão
              </span>
              <button
                type="button"
                disabled
                onClick={() => startEditBuiltin(t)}
                className="rounded-lg p-1 text-faint"
                aria-label="Editar (padrão não editável)"
                title="Tipos padrão não podem ser editados"
              >
                <Edit2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Custom */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Tipos custom</h3>
          {editing?.mode !== 'create' && (
            <Button type="button" size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} />
              Novo tipo
            </Button>
          )}
        </div>

        {tiposCustom.length === 0 && editing?.mode !== 'create' && (
          <p className="mt-4 text-xs text-mist">
            Nenhum tipo custom ainda. Clique em <strong>Novo tipo</strong> pra criar.
          </p>
        )}

        {editing?.mode === 'create' && (
          <div className="mt-4 grid gap-3 rounded-xl border border-indigo/30 bg-elevated p-4 md:grid-cols-3">
            <Field label="Nome">
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex.: Investimento essencial"
              />
            </Field>
            <Field label="Comportamento base">
              <Select
                value={form.comportamento}
                onChange={(e) => setForm({ ...form, comportamento: e.target.value })}
              >
                {COMPORTAMENTOS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cor">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-full rounded-lg border border-line-2 bg-elevated"
              />
            </Field>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="button" size="sm" onClick={submit}>
                <Check size={14} />
                Criar tipo
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                <X size={14} />
                Cancelar
              </Button>
              {error && <span className="text-xs text-red">{error}</span>}
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {tiposCustom.map((t) => {
            const isEditing = editing?.mode === 'edit' && editing.id === t.id
            return (
              <li
                key={t.id}
                className="rounded-xl border border-line-2 bg-bg px-3 py-3"
              >
                {isEditing ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Nome">
                      <Input
                        value={form.label}
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                      />
                    </Field>
                    <Field label="Comportamento base">
                      <Select
                        value={form.comportamento}
                        onChange={(e) => setForm({ ...form, comportamento: e.target.value })}
                      >
                        {COMPORTAMENTOS.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Cor">
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className="h-10 w-full rounded-lg border border-line-2 bg-elevated"
                      />
                    </Field>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Button type="button" size="sm" onClick={submit}>
                        <Check size={14} />
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                        <X size={14} />
                        Cancelar
                      </Button>
                      {error && <span className="text-xs text-red">{error}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{t.label}</p>
                      <p className="truncate text-xs text-mist">
                        Comporta-se como <strong>{t.comportamento}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditCustom(t)}
                      className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-ink"
                      aria-label="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-red"
                      aria-label="Apagar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
