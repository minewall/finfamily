import { create } from 'zustand'
import type { UserData } from '@haile/shared'
import { supabase } from '@/lib/supabase'

interface DataState {
  data: UserData | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

// Carrega o blob user_data do usuário logado (mesmo schema do Dino).
// Por ora read-only; a escrita (save híbrido) entra quando migrarmos telas de edição.
export const useData = create<DataState>((set) => ({
  data: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) {
      set({ loading: false, error: 'Sessão ausente' })
      return
    }
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ data: ((data?.data as UserData) ?? {}) as UserData, loading: false })
  },
}))
