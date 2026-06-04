// Cloudflare Worker — serve static assets + SPA fallback para /app/.
// Lê assets via binding ASSETS (definido em wrangler.toml).
export default {
  async fetch(request, env) {
    // Guard: binding deve existir. Se não, retorna debug claro.
    if (!env || !env.ASSETS) {
      const keys = env ? Object.keys(env) : []
      return new Response(
        `Worker misconfigured: ASSETS binding ausente.\n` +
          `env bindings disponíveis: ${JSON.stringify(keys)}\n` +
          `Fix esperado: wrangler.toml ter [assets] com binding="ASSETS".`,
        { status: 500, headers: { 'content-type': 'text/plain' } },
      )
    }

    const url = new URL(request.url)

    // 1. Tenta servir o asset estático direto (HTML, CSS, JS, img, etc).
    const direct = await env.ASSETS.fetch(request)
    if (direct.status !== 404) return direct

    // 2. SPA fallback: 404 dentro de /app/* → serve /app/index.html
    //    (React Router resolve a rota internamente).
    if (url.pathname.startsWith('/app/')) {
      const indexUrl = new URL('/app/index.html', url.origin)
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request))
    }

    // 3. 404 fora de /app/ → devolve o 404 do Workers Assets.
    return direct
  },
}
