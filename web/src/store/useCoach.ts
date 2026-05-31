import { create } from 'zustand'
import type { CoachToolName } from '@haile/shared'
import type { ContentBlock, CoachUsage } from '@/lib/coach'

// ── Timeline de turns (UI-friendly) ──────────────────────────────
// 1 turn = um bloco visível na conversa. O modelo Anthropic agrupa
// múltiplos blocks num assistant message — aqui achatamos pra a UI
// ficar simples (cada turn é uma bolha ou um card).

export type Turn =
  | { id: string; kind: 'user-text'; text: string }
  | { id: string; kind: 'assistant-text'; text: string }
  | {
      id: string
      kind: 'tool-pending'      // aguardando confirmação do usuário
      tool_use_id: string       // id que veio do Anthropic
      name: CoachToolName
      input: Record<string, unknown>
    }
  | {
      id: string
      kind: 'tool-done'         // executada
      name: CoachToolName
      input: Record<string, unknown>
      summary: string
      isError?: boolean
    }
  | {
      id: string
      kind: 'tool-cancelled'    // usuário cancelou
      name: CoachToolName
      input: Record<string, unknown>
    }

// O que mandamos pro Anthropic na próxima chamada (formato bruto).
// Mantido em paralelo aos turns — turns é só pra UI.
export interface RawMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface CoachState {
  open: boolean
  turns: Turn[]
  rawHistory: RawMessage[]
  loading: boolean
  error: string | null
  usage: CoachUsage | null
  setOpen: (open: boolean) => void
  toggle: () => void
  appendTurn: (t: Turn) => void
  resolveToolPending: (tool_use_id: string, into: Turn) => void
  setRawHistory: (h: RawMessage[]) => void
  pushRaw: (m: RawMessage) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  setUsage: (u: CoachUsage | null) => void
  reset: () => void
}

function uid() {
  return 'turn_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useCoach = create<CoachState>((set) => ({
  open: false,
  turns: [],
  rawHistory: [],
  loading: false,
  error: null,
  usage: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  appendTurn: (t) => set((s) => ({ turns: [...s.turns, t] })),
  resolveToolPending: (tool_use_id, into) =>
    set((s) => ({
      turns: s.turns.map((t) =>
        t.kind === 'tool-pending' && t.tool_use_id === tool_use_id ? into : t,
      ),
    })),
  setRawHistory: (rawHistory) => set({ rawHistory }),
  pushRaw: (m) => set((s) => ({ rawHistory: [...s.rawHistory, m] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUsage: (usage) => set({ usage }),
  reset: () => set({ turns: [], rawHistory: [], error: null }),
}))

export { uid as newTurnId }

// Helper de debug: em dev expõe o store em window pra testes manuais.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { useCoach: typeof useCoach }).useCoach = useCoach
}
