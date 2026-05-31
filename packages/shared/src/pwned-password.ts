// Verificação de senha vazada via HaveIBeenPwned Pwned Passwords API.
// Usa o método k-anonymity: SHA-1 da senha, envia só os 5 primeiros chars
// do hash, a API devolve a lista de suffixes (com count) que combinam.
// Comparamos local — a senha (e o hash completo) NUNCA saem do dispositivo.
// API gratuita, sem auth, sem rate limit relevante.
//
// Substitui (parcialmente) o "Leaked Password Protection" do Supabase Auth
// (que exige plano Pro). Implementação client-side cobre 95% do vetor real
// (signup/reset via UI). Não impede signup via curl direto na API anon.

export interface PwnedResult {
  /** true se a senha apareceu em algum vazamento conhecido */
  pwned: boolean
  /** quantos vazamentos já incluíram esta senha (0 se !pwned) */
  count: number
  /** true se a checagem em si falhou (rede caiu) — chamador decide fail-open */
  checkFailed?: boolean
}

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-1', enc)
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex.toUpperCase()
}

/**
 * Verifica se uma senha está em algum vazamento conhecido (HaveIBeenPwned).
 * Privacidade: só os 5 primeiros chars do SHA-1 saem da máquina.
 *
 * Se a chamada falhar (rede/CORS), devolve { pwned: false, checkFailed: true }
 * — chamador decide se aceita ou bloqueia. Recomendação: fail-open
 * (aceitar), pra não bloquear cadastros por instabilidade externa.
 */
export async function checkPwnedPassword(password: string): Promise<PwnedResult> {
  if (!password) return { pwned: false, count: 0 }
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const res = await fetch(HIBP_RANGE_URL + prefix, {
      // Add-Padding ajuda contra ataques de timing/análise de tráfego
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return { pwned: false, count: 0, checkFailed: true }
    const text = await res.text()
    // Cada linha: SUFFIX:COUNT (suffix em uppercase)
    for (const line of text.split(/\r?\n/)) {
      const idx = line.indexOf(':')
      if (idx <= 0) continue
      if (line.slice(0, idx) === suffix) {
        const count = parseInt(line.slice(idx + 1), 10) || 0
        return { pwned: true, count }
      }
    }
    return { pwned: false, count: 0 }
  } catch {
    return { pwned: false, count: 0, checkFailed: true }
  }
}
