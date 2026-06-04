// Cloudflare Worker — serve static assets + SPA fallback para /app/.
// Lê assets via binding ASSETS (definido em wrangler.toml).
// Doc: https://developers.cloudflare.com/workers/static-assets/binding/
export default {
  async fetch(request, env) {
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

    // 3. 404 fora de /app/ → devolve o 404 default do Workers Assets.
    return direct
  },
}
