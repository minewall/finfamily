import { useMemo, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { CATEGORIES, TIPOS_BUILTIN } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

interface CategoriaRow {
  id: string
  label: string
  color: string
  icon: string
  builtin: boolean
}

interface CustomCategoriaBlob {
  id: string
  label: string
  color: string
  icon: string
}

export function CategoriasSection() {
  const data = useData((s) => s.data)
  const addCategoria = useData((s) => s.addCategoria)
  const updateCategoria = useData((s) => s.updateCategoria)
  const deleteCategoria = useData((s) => s.deleteCategoria)
  const reorderCategorias = useData((s) => s.reorderCategorias)
  const addSub = useData((s) => s.addSubcategoria)
  const renameSub = useData((s) => s.renameSubcategoria)
  const deleteSub = useData((s) => s.deleteSubcategoria)
  const setCatTipo = useData((s) => s.setCatTipo)
  const getCategoriaUsage = useData((s) => s.getCategoriaUsage)

  const customCats = useMemo<CustomCategoriaBlob[]>(
    () => (data?.categoriasCustom ?? []) as CustomCategoriaBlob[],
    [data?.categoriasCustom],
  )

  // Lista unificada: built-in + custom, na ordem custom (se houver) ou alfabética default.
  const allRows: CategoriaRow[] = useMemo(() => {
    const builtinRows: CategoriaRow[] = Object.entries(CATEGORIES)
      .filter(([id]) => id !== 'receita')
      .map(([id, def]) => ({
        id,
        label: def.label,
        color: def.color,
        icon: def.icon,
        builtin: true,
      }))
    const customRows: CategoriaRow[] = customCats.map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      icon: c.icon,
      builtin: false,
    }))
    const merged = [...builtinRows, ...customRows]
    const order = data?.categoryOrder ?? []
    if (order.length === 0) return merged
    const byId = new Map(merged.map((r) => [r.id, r]))
    const ordered: CategoriaRow[] = []
    for (const id of order) {
      const row = byId.get(id)
      if (row) {
        ordered.push(row)
        byId.delete(id)
      }
    }
    // resto na ordem original
    for (const r of merged) {
      if (byId.has(r.id)) ordered.push(r)
    }
    return ordered
  }, [customCats, data?.categoryOrder])

  // Tipos disponíveis pra associar (built-in + custom).
  const tiposDisponiveis = useMemo(() => {
    const builtin = TIPOS_BUILTIN.map((t) => ({ id: t.id as string, label: t.label }))
    const custom = (data?.tiposCustom ?? []).map((t) => ({ id: t.id, label: t.label }))
    return [...builtin, ...custom]
  }, [data?.tiposCustom])

  const catTipoMap = (data?.catTipo ?? {}) as Record<string, string>
  const subcategorias = (data?.subcategorias ?? {}) as Record<string, string[]>

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    label: '',
    color: '#7C6EF8',
    icon: 'circle',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ label: '', color: '#7C6EF8', icon: 'circle' })
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({})
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({})
  const [editingSub, setEditingSub] = useState<{ catId: string; name: string } | null>(null)
  const [editingSubValue, setEditingSubValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function moveUp(id: string) {
    const ids = allRows.map((r) => r.id)
    const i = ids.indexOf(id)
    if (i <= 0) return
    const next = [...ids]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    reorderCategorias(next)
  }
  function moveDown(id: string) {
    const ids = allRows.map((r) => r.id)
    const i = ids.indexOf(id)
    if (i < 0 || i >= ids.length - 1) return
    const next = [...ids]
    ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
    reorderCategorias(next)
  }

  function submitCreate() {
    setError(null)
    try {
      addCategoria({ label: createForm.label, color: createForm.color, icon: createForm.icon })
      setCreateOpen(false)
      setCreateForm({ label: '', color: '#7C6EF8', icon: 'circle' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar')
    }
  }

  function startEdit(row: CategoriaRow) {
    setEditingId(row.id)
    setEditForm({ label: row.label, color: row.color, icon: row.icon })
    setError(null)
  }
  function submitEdit() {
    if (!editingId) return
    setError(null)
    try {
      updateCategoria(editingId, editForm)
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }
  function handleDeleteCat(id: string) {
    const usage = getCategoriaUsage(id)
    const msg =
      usage > 0
        ? `Esta categoria tem ${usage} lançamento(s) referenciando ela. Apagar mesmo assim?`
        : 'Apagar esta categoria?'
    if (!window.confirm(msg)) return
    deleteCategoria(id)
  }

  function toggleSubs(catId: string) {
    setExpandedSubs((p) => ({ ...p, [catId]: !p[catId] }))
  }
  function submitAddSub(catId: string) {
    const val = (newSubInputs[catId] ?? '').trim()
    if (!val) return
    setError(null)
    try {
      addSub(catId, val)
      setNewSubInputs((p) => ({ ...p, [catId]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar')
    }
  }
  function submitRenameSub() {
    if (!editingSub) return
    setError(null)
    try {
      renameSub(editingSub.catId, editingSub.name, editingSubValue.trim())
      setEditingSub(null)
      setEditingSubValue('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao renomear')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Categorias</h2>
        <p className="mt-1 text-sm text-mist">
          Organize seus lançamentos em categorias e subcategorias. Defina o tipo de cada
          uma pra alimentar o Poder de Escolha.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Categorias padrão não podem ser editadas — você pode criar novas, reordenar
          a lista e ajustar o tipo associado.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Categorias ativas</h3>
          {!createOpen && (
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Nova categoria
            </Button>
          )}
        </div>

        {createOpen && (
          <div className="mt-4 grid gap-3 rounded-xl border border-indigo/30 bg-elevated p-4 md:grid-cols-3">
            <Field label="Nome">
              <Input
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                placeholder="Ex.: Investimentos pessoais"
              />
            </Field>
            <Field label="Cor">
              <input
                type="color"
                value={createForm.color}
                onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                className="h-10 w-full rounded-lg border border-line-2 bg-elevated"
              />
            </Field>
            <Field label="Ícone (Lucide)">
              <Input
                value={createForm.icon}
                onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                placeholder="circle"
              />
            </Field>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="button" size="sm" onClick={submitCreate}>
                <Check size={14} />
                Criar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
                <X size={14} />
                Cancelar
              </Button>
              {error && <span className="text-xs text-red">{error}</span>}
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {allRows.map((row, idx) => {
            const isEditing = editingId === row.id
            const expanded = !!expandedSubs[row.id]
            const subs = subcategorias[row.id] ?? []
            const tipoAtual = catTipoMap[row.id] ?? ''
            return (
              <li key={row.id} className="rounded-xl border border-line-2 bg-bg">
                <div className="flex items-center gap-2 px-3 py-3">
                  {/* reorder */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveUp(row.id)}
                      disabled={idx === 0}
                      className="rounded p-0.5 text-mist hover:bg-elevated hover:text-ink disabled:opacity-30"
                      aria-label="Subir"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(row.id)}
                      disabled={idx === allRows.length - 1}
                      className="rounded p-0.5 text-mist hover:bg-elevated hover:text-ink disabled:opacity-30"
                      aria-label="Descer"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />

                  {isEditing && !row.builtin ? (
                    <div className="grid flex-1 gap-2 md:grid-cols-3">
                      <Input
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        className="h-10 w-full rounded-lg border border-line-2 bg-elevated"
                      />
                      <Input
                        value={editForm.icon}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                        placeholder="circle"
                      />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{row.label}</p>
                      <p className="text-[11px] text-faint">
                        {row.builtin ? 'Padrão' : 'Custom'} · {subs.length} subcategoria
                        {subs.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}

                  {/* Tipo selector */}
                  <Select
                    value={tipoAtual}
                    onChange={(e) => setCatTipo(row.id, e.target.value)}
                    className="w-40 shrink-0"
                    aria-label="Tipo associado"
                  >
                    <option value="">— tipo padrão —</option>
                    {tiposDisponiveis.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </Select>

                  <button
                    type="button"
                    onClick={() => toggleSubs(row.id)}
                    className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-ink"
                    aria-label="Mostrar subcategorias"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {!row.builtin && (
                    isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={submitEdit}
                          className="rounded-lg p-1 text-green hover:bg-elevated"
                          aria-label="Salvar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-ink"
                          aria-label="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-ink"
                          aria-label="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCat(row.id)}
                          className="rounded-lg p-1 text-mist hover:bg-elevated hover:text-red"
                          aria-label="Apagar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )
                  )}
                </div>

                {expanded && (
                  <div className="border-t border-line-2 px-3 py-3">
                    <h4 className="text-[11px] uppercase tracking-wide text-faint">
                      Subcategorias
                    </h4>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {subs.length === 0 && (
                        <li className="text-xs text-mist">Nenhuma ainda.</li>
                      )}
                      {subs.map((s) => {
                        const editing =
                          editingSub?.catId === row.id && editingSub.name === s
                        return (
                          <li
                            key={s}
                            className="flex items-center gap-1 rounded-full border border-line-2 bg-surface px-2.5 py-1 text-xs text-ink"
                          >
                            {editing ? (
                              <>
                                <input
                                  className="h-6 w-32 rounded border border-line-2 bg-bg px-1.5 text-xs text-ink outline-none focus:border-indigo"
                                  value={editingSubValue}
                                  onChange={(e) => setEditingSubValue(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={submitRenameSub}
                                  className="text-green hover:text-ink"
                                  aria-label="Confirmar"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSub(null)}
                                  className="text-mist hover:text-ink"
                                  aria-label="Cancelar"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span>{s}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSub({ catId: row.id, name: s })
                                    setEditingSubValue(s)
                                  }}
                                  className="text-mist hover:text-ink"
                                  aria-label="Renomear"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Apagar subcategoria "${s}"?`)) {
                                      deleteSub(row.id, s)
                                    }
                                  }}
                                  className="text-mist hover:text-red"
                                  aria-label="Apagar"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={newSubInputs[row.id] ?? ''}
                        onChange={(e) =>
                          setNewSubInputs((p) => ({ ...p, [row.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            submitAddSub(row.id)
                          }
                        }}
                        placeholder="Nova subcategoria"
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => submitAddSub(row.id)}
                      >
                        <Plus size={12} />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {error && (
          <p className="mt-3 text-xs text-red">{error}</p>
        )}
      </div>
    </div>
  )
}
