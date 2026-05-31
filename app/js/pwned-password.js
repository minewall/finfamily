// Verificação client-side de senha vazada via HaveIBeenPwned (k-anonymity).
// SHA-1 da senha → envia só os 5 primeiros chars do hash → compara local
// com a lista de suffixes que a API retorna. Senha (e hash completo) nunca
// saem do dispositivo. API gratuita, sem auth.
//
// Substitui (parcialmente) o "Leaked Password Protection" do Supabase Auth,
// que exige Pro plan. Cobre signup/reset via UI (vetor real); não impede
// signup via curl direto na API anon.
//
// Espelho JS do TS em packages/shared/src/pwned-password.ts.

(function (root) {
  const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

  async function sha1Hex(input) {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-1', enc);
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (const b of bytes) hex += b.toString(16).padStart(2, '0');
    return hex.toUpperCase();
  }

  /**
   * @param {string} password
   * @returns {Promise<{pwned: boolean, count: number, checkFailed?: boolean}>}
   */
  async function checkPwnedPassword(password) {
    if (!password) return { pwned: false, count: 0 };
    try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const res = await fetch(HIBP_RANGE_URL + prefix, {
        headers: { 'Add-Padding': 'true' },
      });
      if (!res.ok) return { pwned: false, count: 0, checkFailed: true };
      const text = await res.text();
      for (const line of text.split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx <= 0) continue;
        if (line.slice(0, idx) === suffix) {
          const count = parseInt(line.slice(idx + 1), 10) || 0;
          return { pwned: true, count };
        }
      }
      return { pwned: false, count: 0 };
    } catch {
      return { pwned: false, count: 0, checkFailed: true };
    }
  }

  root.HailePwned = { checkPwnedPassword };
})(typeof window !== 'undefined' ? window : self);
