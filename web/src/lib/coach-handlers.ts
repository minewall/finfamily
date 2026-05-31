// Handlers das tools do Haile — executam contra o useData.
// Cada handler recebe o input bruto da tool, valida, executa e devolve
// um string que vira o conteúdo do tool_result (visível ao modelo).
import type { CoachToolName } from '@haile/shared'
import { getLancamentos, currencyBRL, getCategoryLabel } from '@haile/shared'
import { useData } from '@/store/useData'

type Input = Record<string, unknown>

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

export interface HandlerResult {
  /** Texto que vai pro modelo via tool_result.content */
  content: string
  /** Resumo curto pra UI (1 linha) */
  summary: string
  isError?: boolean
}

export function runCoachTool(name: CoachToolName, input: Input): HandlerResult {
  const store = useData.getState()

  switch (name) {
    case 'addDespesa': {
      const descricao = asString(input.descricao)?.trim()
      const valor = asNumber(input.valor)
      const data = asString(input.data)
      const categoria = asString(input.categoria)
      const pessoa = asString(input.pessoa)
      const sub = asString(input.sub) ?? null
      if (!descricao || !valor || valor <= 0 || !data || !categoria) {
        return { content: 'Erro: campos obrigatórios faltando (descricao, valor>0, data YYYY-MM-DD, categoria).', summary: 'erro de input', isError: true }
      }
      store.addDespesa({
        desc: descricao,
        amount: valor,
        date: data,
        category: categoria,
        sub,
        person: pessoa,
      })
      return {
        content: `Despesa criada: "${descricao}" de ${currencyBRL(valor)} em ${data} (${getCategoryLabel(categoria)}).`,
        summary: `${descricao} · ${currencyBRL(valor)}`,
      }
    }

    case 'updateDespesa': {
      const id = asString(input.id)
      if (!id) return { content: 'Erro: id da despesa obrigatório.', summary: 'erro de input', isError: true }
      const d = (useData.getState().data?.despesas ?? []).find((x) => x.id === id)
      if (!d) return { content: `Erro: despesa ${id} não encontrada.`, summary: 'não encontrada', isError: true }
      const patch: Record<string, unknown> = {}
      if (asString(input.descricao)) patch.desc = (input.descricao as string).trim()
      const v = asNumber(input.valor); if (v !== undefined) patch.amount = v
      if (asString(input.data)) patch.date = input.data as string
      if (asString(input.categoria)) patch.category = input.categoria as string
      if (asString(input.sub)) patch.sub = input.sub as string
      store.updateDespesa(id, patch)
      return {
        content: `Despesa ${id} atualizada (${Object.keys(patch).join(', ') || 'sem mudanças'}).`,
        summary: `Atualizada: ${d.desc}`,
      }
    }

    case 'deleteDespesa': {
      const id = asString(input.id)
      if (!id) return { content: 'Erro: id obrigatório.', summary: 'erro de input', isError: true }
      const d = (useData.getState().data?.despesas ?? []).find((x) => x.id === id)
      if (!d) return { content: `Erro: despesa ${id} não encontrada.`, summary: 'não encontrada', isError: true }
      store.deleteDespesa(id)
      return {
        content: `Despesa removida: "${d.desc}" de ${currencyBRL(Number(d.amount) || 0)}.`,
        summary: `Excluída: ${d.desc}`,
      }
    }

    case 'addReceita': {
      const descricao = asString(input.descricao)?.trim()
      const valor = asNumber(input.valor)
      const data = asString(input.data)
      const pessoa = asString(input.pessoa)
      const tipo = asString(input.tipo) ?? 'outros'
      if (!descricao || !valor || valor <= 0 || !data) {
        return { content: 'Erro: campos obrigatórios faltando (descricao, valor>0, data).', summary: 'erro de input', isError: true }
      }
      store.addReceita({
        desc: descricao,
        amount: valor,
        date: data,
        person: pessoa,
        type: tipo,
        category: 'receita',
      })
      return {
        content: `Receita criada: "${descricao}" de ${currencyBRL(valor)} em ${data}.`,
        summary: `${descricao} · ${currencyBRL(valor)}`,
      }
    }

    case 'bulkAddDespesas': {
      const itemsIn = input.items
      if (!Array.isArray(itemsIn) || itemsIn.length === 0) {
        return { content: 'Erro: lista de items vazia.', summary: 'erro', isError: true }
      }
      const valid: Parameters<typeof store.bulkAddDespesas>[0] = []
      const erros: string[] = []
      itemsIn.forEach((it, i) => {
        const r = it as Record<string, unknown>
        const descricao = asString(r.descricao)?.trim()
        const valor = asNumber(r.valor)
        const data = asString(r.data)
        const categoria = asString(r.categoria)
        if (!descricao || !valor || valor <= 0 || !data || !categoria) {
          erros.push(`item ${i + 1}: campos faltando`)
          return
        }
        valid.push({
          desc: descricao, amount: valor, date: data,
          category: categoria, sub: asString(r.sub) ?? null,
          person: asString(r.pessoa),
        })
      })
      if (valid.length === 0) {
        return { content: 'Erro: nenhum item válido. ' + erros.join('; '), summary: '0 items', isError: true }
      }
      const created = store.bulkAddDespesas(valid)
      const total = created.reduce((s, x) => s + (Number(x.amount) || 0), 0)
      const aviso = erros.length > 0 ? ` (${erros.length} ignorados: ${erros.join('; ')})` : ''
      return {
        content: `Criadas ${created.length} despesas, total ${currencyBRL(total)}.${aviso}`,
        summary: `${created.length} despesas · ${currencyBRL(total)}`,
      }
    }

    case 'bulkAddReceitas': {
      const itemsIn = input.items
      if (!Array.isArray(itemsIn) || itemsIn.length === 0) {
        return { content: 'Erro: lista de items vazia.', summary: 'erro', isError: true }
      }
      const valid: Parameters<typeof store.bulkAddReceitas>[0] = []
      const erros: string[] = []
      itemsIn.forEach((it, i) => {
        const r = it as Record<string, unknown>
        const descricao = asString(r.descricao)?.trim()
        const valor = asNumber(r.valor)
        const data = asString(r.data)
        if (!descricao || !valor || valor <= 0 || !data) {
          erros.push(`item ${i + 1}: campos faltando`)
          return
        }
        valid.push({
          desc: descricao, amount: valor, date: data,
          person: asString(r.pessoa),
          type: asString(r.tipo) ?? 'outros',
          category: 'receita',
        })
      })
      if (valid.length === 0) {
        return { content: 'Erro: nenhum item válido. ' + erros.join('; '), summary: '0 items', isError: true }
      }
      const created = store.bulkAddReceitas(valid)
      const total = created.reduce((s, x) => s + (Number(x.amount) || 0), 0)
      return {
        content: `Criadas ${created.length} receitas, total ${currencyBRL(total)}.`,
        summary: `${created.length} receitas · ${currencyBRL(total)}`,
      }
    }

    case 'queryDespesas': {
      const data = useData.getState().data ?? {}
      const month = asNumber(input.month)
      const year = asNumber(input.year)
      const cat = asString(input.categoria)?.toLowerCase()
      const pess = asString(input.pessoa)?.toLowerCase()
      const txt = asString(input.texto)?.toLowerCase()
      let xs = getLancamentos(data, {
        month: month && year ? month : undefined,
        year: month && year ? year : undefined,
      }).filter((x) => x.kind === 'despesa')
      if (cat) xs = xs.filter((x) => (x.category ?? '').toLowerCase() === cat)
      if (pess) xs = xs.filter((x) => (x.person ?? '').toLowerCase().includes(pess))
      if (txt) xs = xs.filter((x) => x.desc.toLowerCase().includes(txt))
      const total = xs.reduce((s, x) => s + x.amount, 0)
      const top = xs.slice(0, 10)
      const lines = top.map((x) =>
        `  - ${x.date} · ${x.desc} · ${currencyBRL(x.amount)} · ${getCategoryLabel(x.category)}${x.person ? ' · ' + x.person : ''}`,
      ).join('\n')
      const more = xs.length > top.length ? `\n  (… +${xs.length - top.length})` : ''
      return {
        content: `Encontradas ${xs.length} despesas — total ${currencyBRL(total)}.\n${lines}${more}`,
        summary: `${xs.length} despesas · ${currencyBRL(total)}`,
      }
    }
  }

  return { content: `Tool desconhecida: ${name}`, summary: 'erro', isError: true }
}
