import { create } from 'zustand'
import type {
  UserData,
  Despesa,
  Receita,
  Conta,
  Meta,
  Contrato,
  Equipamento,
  Veiculo,
  Imovel,
  Ativo,
  Passivo,
  Financiamento,
  EstrategiaAntecipacao,
  Tributo,
  Recado,
  CotacoesAuto,
} from '@haile/shared'
import { regenAllContratos, markAllPastParcelas } from '@haile/shared'
import { fetchCotacoes } from '@/lib/cotacoes'
import { supabase } from '@/lib/supabase'

/** Buckets de patrimônio com CRUD genérico via helpers. */
type PatrimonioBucket = 'equipamentos' | 'veiculos' | 'imoveis' | 'ativos' | 'passivos'
type PatrimonioItem = Equipamento | Veiculo | Imovel | Ativo | Passivo

const LOCAL_KEY = 'haile_duo_user_data'
const SYNC_DEBOUNCE_MS = 2000

interface DataState {
  data: UserData | null
  loading: boolean
  error: string | null
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'

  load: () => Promise<void>
  // mutations
  addDespesa: (input: Omit<Despesa, 'id' | 'month' | 'year'> & Partial<Pick<Despesa, 'id' | 'month' | 'year'>>) => void
  updateDespesa: (id: string, patch: Partial<Despesa>) => void
  deleteDespesa: (id: string) => void
  addReceita: (input: Omit<Receita, 'id' | 'month' | 'year'> & Partial<Pick<Receita, 'id' | 'month' | 'year'>>) => void
  updateReceita: (id: string, patch: Partial<Receita>) => void
  deleteReceita: (id: string) => void
  addConta: (input: Omit<Conta, 'id'> & Partial<Pick<Conta, 'id'>>) => void
  updateConta: (id: string, patch: Partial<Conta>) => void
  deleteConta: (id: string) => void
  addMeta: (input: Omit<Meta, 'id'> & Partial<Pick<Meta, 'id'>>) => void
  updateMeta: (id: string, patch: Partial<Meta>) => void
  deleteMeta: (id: string) => void
  bulkAddDespesas: (
    inputs: Array<Omit<Despesa, 'id' | 'month' | 'year'> & Partial<Pick<Despesa, 'id' | 'month' | 'year'>>>,
  ) => Despesa[]
  bulkAddReceitas: (
    inputs: Array<Omit<Receita, 'id' | 'month' | 'year'> & Partial<Pick<Receita, 'id' | 'month' | 'year'>>>,
  ) => Receita[]
  /** Flag genérica em data.flags (porta de Store.getFlag/setFlag do Dino). */
  getFlag: (key: string, fallback?: boolean) => boolean
  setFlag: (key: string, value: boolean) => void
  // ── Perfil (Sprint 5 — Configurações) ──
  getProfile: () => { name: string; timezone: string; avatar: string | null }
  setProfile: (patch: Partial<{ name: string; timezone: string; avatar: string | null }>) => void
  // ── Settings genéricas (theme, ui prefs, etc.) ──
  getSetting: <T = unknown>(key: string, fallback?: T) => T
  setSetting: (key: string, value: unknown) => void
  // ── Substituir blob inteiro (import/reset de Backup) ──
  replaceAll: (next: UserData) => void
  // ── Tributário ──
  addTributo: (input: Omit<Tributo, 'id'> & Partial<Pick<Tributo, 'id'>>) => Tributo
  updateTributo: (id: string, patch: Partial<Tributo>) => void
  deleteTributo: (id: string) => void
  marcarParcelaTributoPaga: (id: string) => void
  // ── Recados do Haile ──
  addRecado: (input: Omit<Recado, 'id' | 'criadoEm'> & Partial<Pick<Recado, 'id' | 'criadoEm'>>) => Recado
  marcarRecadoLido: (id: string) => void
  marcarTodosLidos: () => void
  deleteRecado: (id: string) => void
  // ── Cotações ──
  refreshCotacoes: () => Promise<CotacoesAuto | null>
  // ── Pessoas (porta de Store.addPessoa/renamePessoa/deletePessoa) ──
  addPessoa: (name: string) => void
  renamePessoa: (oldName: string, newName: string) => void
  deletePessoa: (name: string) => void
  // ── Reembolsos ──
  marcarReembolsoPago: (despesaId: string) => void
  marcarReembolsoPendente: (despesaId: string) => void
  // ── Compromissos (Contratos recorrentes + Dívidas) ──
  addContrato: (input: Omit<Contrato, 'id' | 'parcelas'> & Partial<Pick<Contrato, 'id' | 'parcelas'>>) => Contrato
  updateContrato: (id: string, patch: Partial<Contrato>) => void
  deleteContrato: (id: string) => void
  marcarParcelaPaga: (contratoId: string, mes: number, ano: number, valorPago?: number) => void
  marcarParcelaPendente: (contratoId: string, mes: number, ano: number) => void
  // ── Patrimônio (CRUD genérico por bucket) ──
  addPatrimonioItem: <T extends PatrimonioItem>(bucket: PatrimonioBucket, item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>) => T
  updatePatrimonioItem: <T extends PatrimonioItem>(bucket: PatrimonioBucket, id: string, patch: Partial<T>) => void
  deletePatrimonioItem: (bucket: PatrimonioBucket, id: string) => void
  // ── Financiamentos ──
  addFinanciamento: (input: Omit<Financiamento, 'id'> & Partial<Pick<Financiamento, 'id'>>) => Financiamento
  updateFinanciamento: (id: string, patch: Partial<Financiamento>) => void
  deleteFinanciamento: (id: string) => void
  /** Antecipa parcelas: aplica `valorExtra` reduzindo saldo. Estratégia 'prazo'
   *  encurta prazo, 'parcela' mantém prazo. Conservador — apenas ajusta o blob. */
  anteciparFinanciamento: (id: string, valorExtra: number, estrategia?: EstrategiaAntecipacao) => void
}

function newId() { return '_' + Math.random().toString(36).slice(2) }

function deriveMonthYear(date: string): { month: number; year: number } {
  const [y, m] = (date || '').split('-').map(Number)
  return { month: m || 0, year: y || 0 }
}

let _pushTimer: ReturnType<typeof setTimeout> | null = null

async function pushToCloud(data: UserData) {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { error: 'sem sessão' as const }
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: uid, data }, { onConflict: 'user_id' })
  return { error: error ? error.message : null }
}

function readLocal(): UserData | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as UserData) : null
  } catch { return null }
}
function writeLocal(d: UserData) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)) } catch { /* quota */ }
}

export const useData = create<DataState>((set, get) => {
  // Persistência híbrida: localStorage imediato + push debounced pro Supabase.
  // Stamp _syncedAt em cada save (lógica de conflito reusa a do Dino).
  function persist(next: UserData) {
    const stamped: UserData = { ...next, _syncedAt: Date.now() as unknown as UserData['_syncedAt'] }
    writeLocal(stamped)
    set({ data: stamped, syncStatus: 'syncing' })
    if (_pushTimer) clearTimeout(_pushTimer)
    _pushTimer = setTimeout(async () => {
      // erro de sync não polui `error` global (que é da carga inicial) —
      // representado por syncStatus + log interno.
      const { error } = await pushToCloud(stamped)
      set({ syncStatus: error ? 'error' : 'synced' })
      if (error) console.warn('[duo] sync failed:', error)
    }, SYNC_DEBOUNCE_MS)
  }

  function ensure(): UserData {
    return get().data ?? readLocal() ?? {}
  }

  return {
    data: null,
    loading: false,
    error: null,
    syncStatus: 'idle',

    load: async () => {
      set({ loading: true, error: null })
      const local = readLocal()
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) {
        set({ loading: false, error: 'Sessão ausente', data: local })
        return
      }
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', uid)
        .maybeSingle()
      if (error) {
        set({ loading: false, error: error.message, data: local })
        return
      }
      const cloud = (data?.data as UserData) ?? null
      // Resolução de conflito: cloud só ganha se for mais recente que local.
      const cloudTs = (cloud?._syncedAt as number) || 0
      const localTs = (local?._syncedAt as number) || 0
      const winner = cloud && cloudTs >= localTs ? cloud : (local ?? cloud ?? {})
      writeLocal(winner)
      set({ data: winner, loading: false, syncStatus: 'synced' })
    },

    addDespesa: (input) => {
      const d = ensure()
      const entry: Despesa = {
        ...input,
        id: input.id ?? newId(),
        ...deriveMonthYear(String(input.date ?? '')),
      } as Despesa
      const next: UserData = { ...d, despesas: [...(d.despesas ?? []), entry] }
      persist(next)
    },
    updateDespesa: (id, patch) => {
      const d = ensure()
      const list = (d.despesas ?? []).map((x) => {
        if (x.id !== id) return x
        const merged = { ...x, ...patch } as Despesa
        if (typeof patch.date === 'string') Object.assign(merged, deriveMonthYear(patch.date))
        return merged
      })
      persist({ ...d, despesas: list })
    },
    deleteDespesa: (id) => {
      const d = ensure()
      persist({ ...d, despesas: (d.despesas ?? []).filter((x) => x.id !== id) })
    },

    addReceita: (input) => {
      const d = ensure()
      const entry: Receita = {
        ...input,
        id: input.id ?? newId(),
        ...deriveMonthYear(String(input.date ?? '')),
      } as Receita
      persist({ ...d, receitas: [...(d.receitas ?? []), entry] })
    },
    updateReceita: (id, patch) => {
      const d = ensure()
      const list = (d.receitas ?? []).map((x) => {
        if (x.id !== id) return x
        const merged = { ...x, ...patch } as Receita
        if (typeof patch.date === 'string') Object.assign(merged, deriveMonthYear(patch.date))
        return merged
      })
      persist({ ...d, receitas: list })
    },
    deleteReceita: (id) => {
      const d = ensure()
      persist({ ...d, receitas: (d.receitas ?? []).filter((x) => x.id !== id) })
    },

    addConta: (input) => {
      const d = ensure()
      const entry: Conta = { ...input, id: input.id ?? newId() } as Conta
      persist({ ...d, contas: [...(d.contas ?? []), entry] })
    },
    updateConta: (id, patch) => {
      const d = ensure()
      const list = (d.contas ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c))
      persist({ ...d, contas: list })
    },
    deleteConta: (id) => {
      const d = ensure()
      persist({ ...d, contas: (d.contas ?? []).filter((c) => c.id !== id) })
    },

    addMeta: (input) => {
      const d = ensure()
      const entry: Meta = { active: true, ...input, id: input.id ?? newId() } as Meta
      persist({ ...d, metas: [...(d.metas ?? []), entry] })
    },
    updateMeta: (id, patch) => {
      const d = ensure()
      const list = (d.metas ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m))
      persist({ ...d, metas: list })
    },
    deleteMeta: (id) => {
      const d = ensure()
      persist({ ...d, metas: (d.metas ?? []).filter((m) => m.id !== id) })
    },

    bulkAddDespesas: (inputs) => {
      const d = ensure()
      const entries: Despesa[] = inputs.map((input) => ({
        ...input,
        id: input.id ?? newId(),
        ...deriveMonthYear(String(input.date ?? '')),
      } as Despesa))
      persist({ ...d, despesas: [...(d.despesas ?? []), ...entries] })
      return entries
    },
    bulkAddReceitas: (inputs) => {
      const d = ensure()
      const entries: Receita[] = inputs.map((input) => ({
        ...input,
        id: input.id ?? newId(),
        ...deriveMonthYear(String(input.date ?? '')),
      } as Receita))
      persist({ ...d, receitas: [...(d.receitas ?? []), ...entries] })
      return entries
    },

    getFlag: (key, fallback = false) => {
      const flags = (ensure().flags ?? {}) as Record<string, boolean>
      return key in flags ? !!flags[key] : fallback
    },
    setFlag: (key, value) => {
      const d = ensure()
      const flags = { ...(d.flags as Record<string, boolean> | undefined ?? {}), [key]: value }
      persist({ ...d, flags })
    },

    addPessoa: (name) => {
      const nome = (name || '').trim()
      if (!nome) throw new Error('Nome obrigatório')
      const d = ensure()
      const list = d.pessoas ?? []
      if (list.includes(nome)) throw new Error('Pessoa já cadastrada')
      persist({ ...d, pessoas: [...list, nome] })
    },
    renamePessoa: (oldName, newName) => {
      const nome = (newName || '').trim()
      if (!nome) throw new Error('Nome obrigatório')
      const d = ensure()
      const list = d.pessoas ?? []
      const idx = list.indexOf(oldName)
      if (idx < 0) return
      const novaLista = [...list]
      novaLista[idx] = nome
      // propagar pra receitas/despesas/splits
      const receitas = (d.receitas ?? []).map((r) =>
        r.person === oldName ? { ...r, person: nome } : r,
      )
      const despesas = (d.despesas ?? []).map((dd) => {
        let next = dd
        if (next.person === oldName) next = { ...next, person: nome }
        if (next.split && next.split.length) {
          const split = next.split.map((s) =>
            s.person === oldName ? { ...s, person: nome } : s,
          )
          next = { ...next, split }
        }
        return next
      })
      persist({ ...d, pessoas: novaLista, receitas, despesas })
    },
    marcarReembolsoPago: (despesaId) => {
      const d = ensure()
      const today = new Date().toISOString().slice(0, 10)
      const despesas = (d.despesas ?? []).map((dd) => {
        if (dd.id !== despesaId || !dd.reembolso) return dd
        return { ...dd, reembolso: { ...dd.reembolso, status: 'pago' as const, paidAt: today } }
      })
      persist({ ...d, despesas })
    },
    marcarReembolsoPendente: (despesaId) => {
      const d = ensure()
      const despesas = (d.despesas ?? []).map((dd) => {
        if (dd.id !== despesaId || !dd.reembolso) return dd
        const { paidAt: _drop, ...rest } = dd.reembolso
        void _drop
        return { ...dd, reembolso: { ...rest, status: 'pendente' as const } }
      })
      persist({ ...d, despesas })
    },

    addContrato: (input) => {
      const d = ensure()
      const base: Contrato = {
        active: true,
        createdAt: new Date().toISOString(),
        ...input,
        id: input.id ?? newId(),
      } as Contrato
      const stamped = markAllPastParcelas(regenAllContratos(base))
      persist({ ...d, contratos: [...(d.contratos ?? []), stamped] })
      return stamped
    },
    updateContrato: (id, patch) => {
      const d = ensure()
      const list = (d.contratos ?? []).map((c) => {
        if (c.id !== id) return c
        const merged = { ...c, ...patch } as Contrato
        // Se mudou algo que impacta geração de parcelas, regenera.
        const regen =
          'periodicidade' in patch ||
          'dataInicio' in patch ||
          'dataFim' in patch ||
          'parcelasTotal' in patch ||
          'diaVencimento' in patch
        return regen ? markAllPastParcelas(regenAllContratos(merged)) : merged
      })
      persist({ ...d, contratos: list })
    },
    deleteContrato: (id) => {
      const d = ensure()
      persist({ ...d, contratos: (d.contratos ?? []).filter((c) => c.id !== id) })
    },
    marcarParcelaPaga: (contratoId, mes, ano, valorPago) => {
      const d = ensure()
      const today = new Date().toISOString().slice(0, 10)
      const list = (d.contratos ?? []).map((c) => {
        if (c.id !== contratoId) return c
        const parcelas = (c.parcelas ?? []).map((p) => {
          if (p.mes !== mes || p.ano !== ano) return p
          return {
            ...p,
            status: 'pago' as const,
            valorPago: typeof valorPago === 'number' ? valorPago : (p.valorPago ?? c.valorParcela),
            date: p.date || today,
          }
        })
        return { ...c, parcelas }
      })
      persist({ ...d, contratos: list })
    },
    marcarParcelaPendente: (contratoId, mes, ano) => {
      const d = ensure()
      const today = new Date().toISOString().slice(0, 10)
      const list = (d.contratos ?? []).map((c) => {
        if (c.id !== contratoId) return c
        const parcelas = (c.parcelas ?? []).map((p) => {
          if (p.mes !== mes || p.ano !== ano) return p
          // Se a parcela voltou pra pendente e já venceu, marca como atrasada.
          const novoStatus = p.date && p.date < today ? 'atrasada' as const : 'pendente' as const
          // Drop valorPago ao reverter (não-pago não tem valor pago)
          const { valorPago: _drop, ...rest } = p
          void _drop
          return { ...rest, status: novoStatus }
        })
        return { ...c, parcelas }
      })
      persist({ ...d, contratos: list })
    },

    // ── Patrimônio (CRUD genérico) ───────────────────────────────
    addPatrimonioItem: <T extends PatrimonioItem>(
      bucket: PatrimonioBucket,
      item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>,
    ) => {
      const d = ensure()
      const idPrefix: Record<PatrimonioBucket, string> = {
        equipamentos: 'eq', veiculos: 'v', imoveis: 'im', ativos: 'a', passivos: '_p',
      }
      const entry = {
        ...item,
        id: (item as { id?: string }).id ?? (idPrefix[bucket] + Date.now()),
        createdAt: (item as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      } as unknown as T
      const list = (d[bucket] ?? []) as T[]
      persist({ ...d, [bucket]: [...list, entry] } as UserData)
      return entry
    },
    updatePatrimonioItem: <T extends PatrimonioItem>(
      bucket: PatrimonioBucket,
      id: string,
      patch: Partial<T>,
    ) => {
      const d = ensure()
      const list = ((d[bucket] ?? []) as T[]).map((x) => (x.id === id ? { ...x, ...patch } : x))
      persist({ ...d, [bucket]: list } as UserData)
    },
    deletePatrimonioItem: (bucket, id) => {
      const d = ensure()
      const list = ((d[bucket] ?? []) as Array<{ id: string }>).filter((x) => x.id !== id)
      persist({ ...d, [bucket]: list } as UserData)
    },

    // ── Financiamentos ───────────────────────────────────────────
    addFinanciamento: (input) => {
      const d = ensure()
      const entry: Financiamento = {
        parcelasPagas: 0,
        ...input,
        id: input.id ?? newId(),
      } as Financiamento
      const list = (d.financiamentos as Financiamento[] | undefined) ?? []
      persist({ ...d, financiamentos: [...list, entry] })
      return entry
    },
    updateFinanciamento: (id, patch) => {
      const d = ensure()
      const list = ((d.financiamentos as Financiamento[] | undefined) ?? []).map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      )
      persist({ ...d, financiamentos: list })
    },
    deleteFinanciamento: (id) => {
      const d = ensure()
      const list = ((d.financiamentos as Financiamento[] | undefined) ?? []).filter((f) => f.id !== id)
      persist({ ...d, financiamentos: list })
    },
    anteciparFinanciamento: (id, valorExtra, estrategia = 'prazo') => {
      const d = ensure()
      const list = (d.financiamentos as Financiamento[] | undefined) ?? []
      const f = list.find((x) => x.id === id)
      if (!f) return
      type Antec = { data: string; valor: number; estrategia: string }
      const prevLog = (f as unknown as { antecipacoes?: Antec[] }).antecipacoes
      const log: Antec[] = Array.isArray(prevLog) ? [...prevLog] : []
      log.push({ data: new Date().toISOString().slice(0, 10), valor: valorExtra, estrategia })
      // Conservador: ambas as estratégias reduzem PV — a UI usa
      // financiamentoAntecipar() pra simular o efeito detalhado.
      const patched = {
        ...f,
        valorFinanciado: Math.max(0, (f.valorFinanciado || 0) - valorExtra),
        antecipacoes: log,
      } as Financiamento
      const next = list.map((x) => (x.id === id ? patched : x))
      persist({ ...d, financiamentos: next })
    },

    // ── Perfil + Settings + replaceAll (Sprint 5) ────────────────
    getProfile: () => {
      const p = (ensure().profile ?? {}) as Record<string, unknown>
      return {
        name: typeof p.name === 'string' ? p.name : 'Usuário',
        timezone: typeof p.timezone === 'string' ? p.timezone : 'America/Sao_Paulo',
        avatar: typeof p.avatar === 'string' ? p.avatar : null,
      }
    },
    setProfile: (patch) => {
      const d = ensure()
      const prev = (d.profile ?? {}) as Record<string, unknown>
      persist({ ...d, profile: { ...prev, ...patch } })
    },
    getSetting: <T = unknown>(key: string, fallback?: T): T => {
      const settings = (ensure().settings ?? {}) as Record<string, unknown>
      return (key in settings ? settings[key] : fallback) as T
    },
    setSetting: (key, value) => {
      const d = ensure()
      const settings = { ...(d.settings ?? {}), [key]: value }
      persist({ ...d, settings })
    },
    replaceAll: (next) => {
      // Substitui o blob inteiro. Usado por import e reset.
      // Limpa _syncedAt pra evitar resolução de conflito atravessada;
      // persist() carimba um novo timestamp.
      const clean = { ...(next || {}) } as UserData
      delete (clean as Record<string, unknown>)._syncedAt
      persist(clean)
    },

    // ── Tributário (Sprint 8) ────────────────────────────────────
    addTributo: (input) => {
      const d = ensure()
      const entry: Tributo = {
        parcelas: 1,
        pagas: 0,
        vencimentoMes: 1,
        vencimentoDia: 10,
        ano: new Date().getFullYear(),
        valor: 0,
        ...input,
        id: input.id ?? newId(),
        createdAt: new Date().toISOString(),
      } as Tributo
      persist({ ...d, tributos: [...(d.tributos ?? []), entry] })
      return entry
    },
    updateTributo: (id, patch) => {
      const d = ensure()
      const list = (d.tributos ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t))
      persist({ ...d, tributos: list })
    },
    deleteTributo: (id) => {
      const d = ensure()
      persist({ ...d, tributos: (d.tributos ?? []).filter((t) => t.id !== id) })
    },
    marcarParcelaTributoPaga: (id) => {
      const d = ensure()
      const list = (d.tributos ?? []).map((t) => {
        if (t.id !== id) return t
        const proximoPagas = Math.min((t.pagas || 0) + 1, t.parcelas || 1)
        return { ...t, pagas: proximoPagas }
      })
      persist({ ...d, tributos: list })
    },

    // ── Recados (Sprint 8) ───────────────────────────────────────
    addRecado: (input) => {
      const d = ensure()
      const entry: Recado = {
        prioridade: 'info',
        ...input,
        id: input.id ?? newId(),
        criadoEm: input.criadoEm ?? new Date().toISOString(),
      } as Recado
      persist({ ...d, recados: [...(d.recados ?? []), entry] })
      return entry
    },
    marcarRecadoLido: (id) => {
      const d = ensure()
      const now = new Date().toISOString()
      const list = (d.recados ?? []).map((r) =>
        r.id === id ? { ...r, lidoEm: r.lidoEm ?? now } : r,
      )
      persist({ ...d, recados: list })
    },
    marcarTodosLidos: () => {
      const d = ensure()
      const now = new Date().toISOString()
      const list = (d.recados ?? []).map((r) => (r.lidoEm ? r : { ...r, lidoEm: now }))
      persist({ ...d, recados: list })
    },
    deleteRecado: (id) => {
      const d = ensure()
      persist({ ...d, recados: (d.recados ?? []).filter((r) => r.id !== id) })
    },

    // ── Cotações (Sprint 8) ──────────────────────────────────────
    refreshCotacoes: async () => {
      const cot = await fetchCotacoes()
      if (!cot) return null
      const d = ensure()
      // Merge — preserva chaves que não vieram nesta atualização
      const merged: CotacoesAuto = { ...(d.cotacoes ?? {}), ...cot }
      persist({ ...d, cotacoes: merged })
      return merged
    },

    deletePessoa: (name) => {
      const d = ensure()
      const usageRec = (d.receitas ?? []).filter((r) => r.person === name).length
      const usageDesp = (d.despesas ?? []).filter(
        (dd) =>
          dd.person === name ||
          (Array.isArray(dd.split) && dd.split.some((s) => s.person === name)),
      ).length
      const usage = usageRec + usageDesp
      if (usage > 0) {
        throw new Error(`${usage} lançamento(s) ainda referenciam esta pessoa`)
      }
      const list = d.pessoas ?? []
      const i = list.indexOf(name)
      if (i < 0) return
      const novaLista = [...list]
      novaLista.splice(i, 1)
      persist({ ...d, pessoas: novaLista })
    },
  }
})
