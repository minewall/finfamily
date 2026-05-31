// Render leve do markdown que o Haile usa (espelho do formatCoachContent do Dino).
// Suporta: **bold**, "+ R$ X" verde / "- R$ X" vermelho, quebras de linha.
// Listas com "- " viram <li>. Sem dependência externa (evita peso de bibliotecas md).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatCoachToHtml(raw: string): string {
  if (!raw) return ''
  let html = escapeHtml(raw)
  // bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // moedas com sinal (BR): +R$ X / -R$ X / − R$ X
  html = html.replace(/([+\-−])\s?R\$\s*[\d.]+(?:,\d{2})?/g, (m) => {
    const cls = m.trim().startsWith('+') ? 'text-green' : 'text-red'
    return `<span class="${cls} font-mono font-bold">${m}</span>`
  })

  // listas: linhas começadas por "- " ou "* " viram bullets agrupados
  const lines = html.split('\n')
  const out: string[] = []
  let inList = false
  for (const line of lines) {
    const liMatch = line.match(/^\s*[-*]\s+(.*)$/)
    if (liMatch) {
      if (!inList) { out.push('<ul class="ml-4 list-disc space-y-1">'); inList = true }
      out.push(`<li>${liMatch[1]}</li>`)
    } else {
      if (inList) { out.push('</ul>'); inList = false }
      if (line.trim() === '') out.push('<br/>')
      else out.push(`<p class="mb-2 last:mb-0">${line}</p>`)
    }
  }
  if (inList) out.push('</ul>')
  return out.join('')
}
