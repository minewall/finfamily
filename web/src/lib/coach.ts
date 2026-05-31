// Cliente do claude-proxy (mesma edge function do Dino).
// Suporta tool use: askCoachRaw devolve blocos crus + stop_reason + usage,
// pra o loop ficar do lado do componente. askCoach é o atalho só-texto.
import { supabase } from './supabase'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://lpudgulhnfuwdttetwdn.supabase.co'}/functions/v1/claude-proxy`

// ── Mensagem do lado do cliente (espelha o Anthropic Messages format) ──
// content pode ser string (atalho) ou array de blocos.
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface CoachUsage {
  used: number
  cap: number
  tier: string
  pct: number
}

export interface RawCoachResponse {
  blocks: ContentBlock[]
  stop_reason: string
  usage?: CoachUsage
}

// Chamada pura: devolve blocos crus pra o caller orquestrar (loop tool use).
export async function askCoachRaw(args: {
  system: string
  messages: CoachMessage[]
  tools?: readonly Record<string, unknown>[]
  model?: string
}): Promise<RawCoachResponse> {
  const { data: sess } = await supabase.auth.getSession()
  const accessToken = sess.session?.access_token
  if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

  const body: Record<string, unknown> = {
    model: args.model ?? 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: args.system,
    messages: args.messages,
  }
  if (args.tools && args.tools.length > 0) body.tools = args.tools

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  const parsed = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 429 && parsed?.error?.type === 'quota_exceeded') {
      const tier = parsed.error.tier ?? 'seu plano'
      throw new Error(`Você atingiu o limite mensal do Haile no ${tier}. Próximo ciclo começa no início do mês.`)
    }
    if (res.status === 401) throw new Error('Sessão expirada. Faça login novamente.')
    throw new Error(parsed?.error?.message ?? `Erro ${res.status}`)
  }

  const blocks: ContentBlock[] = Array.isArray(parsed.content) ? parsed.content : []
  return {
    blocks,
    stop_reason: parsed.stop_reason ?? 'end_turn',
    usage: parsed.usage_haile,
  }
}

// Atalho só-texto (continua usado em chamadas simples; equivale à versão
// anterior de askCoach pra retro-compat).
export async function askCoach(args: {
  system: string
  messages: CoachMessage[]
  model?: string
}): Promise<{ text: string; usage?: CoachUsage }> {
  const r = await askCoachRaw(args)
  const text = r.blocks
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim()
  return { text, usage: r.usage }
}
