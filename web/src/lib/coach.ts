// Cliente do claude-proxy (mesma edge function do Dino).
// Versão DUO sem tool use ainda — só texto. Tools vão num próximo bloco.
import { supabase } from './supabase'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://lpudgulhnfuwdttetwdn.supabase.co'}/functions/v1/claude-proxy`

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachUsage {
  used: number
  cap: number
  tier: string
  pct: number
}

export interface CoachResult {
  text: string
  usage?: CoachUsage
}

export async function askCoach(args: {
  system: string
  messages: CoachMessage[]
  model?: string
}): Promise<CoachResult> {
  const { data: sess } = await supabase.auth.getSession()
  const accessToken = sess.session?.access_token
  if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model: args.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: args.system,
      messages: args.messages,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 429 && body?.error?.type === 'quota_exceeded') {
      const tier = body.error.tier ?? 'seu plano'
      throw new Error(`Você atingiu o limite mensal do Haile no ${tier}. Próximo ciclo começa no início do mês.`)
    }
    if (res.status === 401) throw new Error('Sessão expirada. Faça login novamente.')
    throw new Error(body?.error?.message ?? `Erro ${res.status}`)
  }

  // Resposta no formato Anthropic: { content: [{type:'text', text:'...'}], usage_haile?: {...} }
  const blocks = Array.isArray(body.content) ? body.content : []
  const text = blocks
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n\n')
    .trim()

  return { text, usage: body.usage_haile }
}
