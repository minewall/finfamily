import { create } from 'zustand'
import type { UserData, Despesa, Receita } from '@haile/shared'
import { supabase } from '@/lib/supabase'

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
  }
})
