import { create } from 'zustand'
import type { CoachMessage, CoachUsage } from '@/lib/coach'

interface CoachState {
  open: boolean
  history: CoachMessage[]
  loading: boolean
  error: string | null
  usage: CoachUsage | null
  setOpen: (open: boolean) => void
  toggle: () => void
  appendUser: (text: string) => void
  appendAssistant: (text: string) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  setUsage: (u: CoachUsage | null) => void
  reset: () => void
}

export const useCoach = create<CoachState>((set) => ({
  open: false,
  history: [],
  loading: false,
  error: null,
  usage: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  appendUser: (text) => set((s) => ({ history: [...s.history, { role: 'user', content: text }] })),
  appendAssistant: (text) => set((s) => ({ history: [...s.history, { role: 'assistant', content: text }] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUsage: (usage) => set({ usage }),
  reset: () => set({ history: [], error: null }),
}))
