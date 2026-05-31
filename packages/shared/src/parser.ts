// Parser de extratos bancários (CSV/OFX). Portado do Dino store.js — lógica
// pura, sem dependência de Store. Suporta:
//   - OFX (DTPOSTED, TRNAMT, MEMO/NAME)
//   - CSV Itaú (Data;Histórico;Valor)
//   - CSV Nubank extrato (Data,Categoria,Título,Valor)
//   - Fatura Nubank (date,title,amount) — auto-detectada
//   - Fatura genérica via tipo='fatura'
//   - CSV genérico (header-mapping)
// Robustez: marcadores D/C, trailing minus, datas com ponto (DD.MM.YYYY).

export type ParseFormato =
  | 'ofx' | 'itau-csv' | 'nubank-csv' | 'fatura-nubank' | 'fatura-generico' | 'csv-generico'
  | 'auto' | 'fatura'

export interface ParsedTx {
  id: string
  data: string // YYYY-MM-DD
  descricao: string
  valor: number // negativo = despesa, positivo = receita
  tipo: 'despesa' | 'receita'
  sugestaoCategoria: string | null
  raw: string
}

export interface ParseResult {
  ok: boolean
  formato: ParseFormato | null
  totalLinhas: number
  totalReconhecidas: number
  ignoradas: number
  transacoes: ParsedTx[]
  summary: {
    periodo: { inicio: string | null; fim: string | null }
    totalDespesas: number
    totalReceitas: number
    saldoLiquido: number
    porCategoriaProvisoria: Record<string, number>
  }
  warnings: string[]
  errors: string[]
}

function _stripBOM(s: string): string {
  if (!s) return ''
  if (s.charCodeAt(0) === 0xFEFF) return s.slice(1)
  return s
}

function _splitLines(text: string): string[] {
  return _stripBOM(String(text || '')).replace(/\r\n?/g, '\n').split('\n')
}

function _normalizarData(str: string | null | undefined): string | null {
  if (!str) return null
  const s = String(str).trim()
  // YYYYMMDD[HHmmss...] (OFX)
  let m = s.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return m[1] + '-' + m[2] + '-' + m[3]
  // YYYY-MM-DD ou YYYY/MM/DD ou YYYY.MM.DD
  m = s.match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})/)
  if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0')
  // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  m = s.match(/^(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})/)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = (parseInt(y, 10) >= 70 ? '19' : '20') + y
    return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0')
  }
  return null
}

function _normalizarValor(str: unknown): number {
  if (str == null) return NaN
  if (typeof str === 'number') return str
  let s = String(str).trim()
  if (!s) return NaN
  s = s.replace(/^["']+|["']+$/g, '')
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  s = s.replace(/R\$|\s| /g, '')
  // D/C ao final
  const cd = s.match(/[cd]$/i)
  if (cd && /\d/.test(s.slice(0, -1))) {
    if (/d/i.test(cd[0])) neg = true
    s = s.slice(0, -1)
  }
  // Sinal ao final
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1) }
  else if (s.endsWith('+')) { s = s.slice(0, -1) }
  // Sinal explícito no início
  if (s.startsWith('-')) { neg = true; s = s.slice(1) }
  else if (s.startsWith('+')) { s = s.slice(1) }
  // Separador decimal
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return NaN
  return neg ? -n : n
}

const _KEYWORD_CATS: { re: RegExp; cat: string }[] = [
  { re: /\b(uber|99|99pop|99\s*taxi|taxi|cabify|metr[oô]|cptm|bilhete[\s-]*[uú]nico|pedagio|shell\s*box|posto|combust[ií]vel|gasolina|[aá]lcool|estacion|zona\s*azul)\b/i, cat: 'transporte' },
  { re: /\b(ifood|rappi|uber\s*eats|restaurante|lanchonete|padaria|hamb[uú]rg|pizza|sushi|mc\s*donald|burger\s*king|subway|starbucks|cafeteria)\b/i, cat: 'alimentacao' },
  { re: /\b(shopping|mercado|extra|carrefour|p[aã]o\s*de\s*a[cç][uú]car|assa[ií]|atacad[aã]o|sams|makro|hortifruti|sacol[aã]o|mercearia)\b/i, cat: 'alimentacao' },
  { re: /\b(netflix|spotify|disney|amazon\s*prime|hbo|globoplay|deezer|youtube\s*premium|apple\s*tv|paramount)\b/i, cat: 'assinaturas' },
  { re: /\b(farm[aá]cia|drogasil|drogaria|pacheco|raia|panvel|consulta|m[eé]dico|hospital|laborat[oó]rio|exame|plano\s*de\s*sa[uú]de|unimed|amil|hapvida|bradesco\s*sa[uú]de)\b/i, cat: 'saude' },
  { re: /\b(escola|faculdade|universidade|curso|udemy|alura|coursera|mensalidade\s*escolar)\b/i, cat: 'educacao' },
  { re: /\b(luz|energia|enel|cpfl|cemig|light|[aá]gua|sabesp|cedae|g[aá]s|comgas|aluguel|condom[ií]nio|iptu)\b/i, cat: 'moradia' },
  { re: /\b(vivo|claro|tim|oi|net\s*claro|internet|telefonia|celular\s*pos)\b/i, cat: 'moradia' },
  { re: /\b(sal[aá]rio|sal[aá]rios|proventos|cr[eé]dito\s*sal|pix\s*recebido|transfer[eê]ncia\s*recebida|dep[oó]sito|rendimento|dividendo|jcp|juros\s*sobre)\b/i, cat: 'receita' },
  { re: /\b(tarifa|anuidade|iof|juros|multa|encargo)\b/i, cat: 'financeiro' },
]

function _categorizarPorKeyword(descricao: string | undefined): string | null {
  if (!descricao) return null
  for (const k of _KEYWORD_CATS) {
    if (k.re.test(descricao)) return k.cat
  }
  return null
}

function _parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') { inQuote = false }
      else cur += ch
    } else {
      if (ch === '"') inQuote = true
      else if (ch === sep) { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function _detectSeparator(sample: string): string {
  const semi = (sample.match(/;/g) || []).length
  const comma = (sample.match(/,/g) || []).length
  const tab = (sample.match(/\t/g) || []).length
  const pipe = (sample.match(/\|/g) || []).length
  const max = Math.max(semi, comma, tab, pipe)
  if (max === 0) return ','
  if (max === semi) return ';'
  if (max === tab) return '\t'
  if (max === pipe) return '|'
  return ','
}

interface ParseOpts {
  formato: ParseFormato
  sep: string
  dateCol: number
  descCol: number
  valorCol: number
  hasHeader: boolean
  headerMap?: { date: string[]; desc: string[]; valor: string[] }
  fatura?: boolean
}

function _parseOFX(text: string): { formato: ParseFormato; transacoes: ParsedTx[]; totalLinhas: number; warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []
  const txs: ParsedTx[] = []
  const body = _stripBOM(String(text || ''))
  if (!/<OFX|OFXHEADER/i.test(body)) errors.push('Arquivo não parece OFX (sem header <OFX> ou OFXHEADER)')
  const blocks: string[] = body.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []
  if (!blocks.length) {
    const altBlocks = body.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || []
    if (altBlocks.length) blocks.push(...altBlocks)
  }
  let idx = 0
  for (const block of blocks) {
    idx++
    const getTag = (tag: string) => {
      const m = block.match(new RegExp('<' + tag + '>([^<\r\n]*)', 'i'))
      return m ? m[1].trim() : ''
    }
    const dt = _normalizarData(getTag('DTPOSTED'))
    const valor = _normalizarValor(getTag('TRNAMT'))
    const memo = getTag('MEMO') || getTag('NAME') || ''
    if (!dt || !Number.isFinite(valor)) {
      warnings.push('OFX bloco ' + idx + ' ignorado (data ou valor inválido)')
      continue
    }
    txs.push({
      id: 'tmp-' + idx, data: dt, descricao: memo, valor,
      tipo: valor < 0 ? 'despesa' : 'receita',
      sugestaoCategoria: _categorizarPorKeyword(memo),
      raw: block.replace(/\s+/g, ' ').slice(0, 300),
    })
  }
  return { formato: 'ofx', transacoes: txs, totalLinhas: blocks.length, warnings, errors }
}

function _parseCsvCommon(text: string, opts: ParseOpts): { formato: ParseFormato; transacoes: ParsedTx[]; totalLinhas: number; warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []
  const txs: ParsedTx[] = []
  const lines = _splitLines(text).filter((l) => l.trim().length > 0)
  const startIdx = opts.hasHeader ? 1 : 0
  let dateCol = opts.dateCol, descCol = opts.descCol, valorCol = opts.valorCol

  if (opts.hasHeader && opts.headerMap && lines[0]) {
    const header = _parseCsvLine(lines[0], opts.sep).map((h) => h.toLowerCase().replace(/^["']|["']$/g, ''))
    const resolve = (cands: string[]) => {
      for (let i = 0; i < header.length; i++) {
        for (const c of cands) {
          if (header[i].includes(c)) return i
        }
      }
      return -1
    }
    const d = resolve(opts.headerMap.date)
    const ds = resolve(opts.headerMap.desc)
    const v = resolve(opts.headerMap.valor)
    if (d >= 0) dateCol = d
    if (ds >= 0) descCol = ds
    if (v >= 0) valorCol = v
  }
  if (dateCol < 0 || descCol < 0 || valorCol < 0) {
    errors.push('Colunas (data/descrição/valor) não identificadas')
    return { formato: opts.formato, transacoes: [], totalLinhas: lines.length, warnings, errors }
  }
  let idx = 0
  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i]
    const cols = _parseCsvLine(raw, opts.sep)
    if (cols.length < Math.max(dateCol, descCol, valorCol) + 1) {
      warnings.push('Linha ' + (i + 1) + ' ignorada (colunas insuficientes)')
      continue
    }
    const dataStr = (cols[dateCol] || '').replace(/^["']|["']$/g, '')
    const desc = (cols[descCol] || '').replace(/^["']|["']$/g, '')
    const valorStr = cols[valorCol] || ''
    const dt = _normalizarData(dataStr)
    const valor = _normalizarValor(valorStr)
    if (!dt) { warnings.push('Linha ' + (i + 1) + ' ignorada (data inválida: "' + dataStr + '")'); continue }
    if (!Number.isFinite(valor)) { warnings.push('Linha ' + (i + 1) + ' ignorada (valor inválido: "' + valorStr + '")'); continue }
    idx++
    let _valor = valor, _tipo: 'despesa' | 'receita'
    if (opts.fatura) {
      const isCredito = /pagamento|estorno|cr[eé]dito\b|reembolso|saldo\s*anterior|ajuste\s*a\s*cr[eé]dito|devolu[cç][aã]o/i.test(desc)
      _tipo = isCredito ? 'receita' : 'despesa'
      _valor = isCredito ? Math.abs(valor) : -Math.abs(valor)
    } else {
      _tipo = valor < 0 ? 'despesa' : 'receita'
    }
    txs.push({
      id: 'tmp-' + idx, data: dt, descricao: desc, valor: _valor, tipo: _tipo,
      sugestaoCategoria: _categorizarPorKeyword(desc),
      raw: raw.slice(0, 300),
    })
  }
  return { formato: opts.formato, transacoes: txs, totalLinhas: lines.length, warnings, errors }
}

function _parseItauCsv(text: string) {
  return _parseCsvCommon(text, {
    formato: 'itau-csv', sep: ';', dateCol: 0, descCol: 1, valorCol: 2,
    hasHeader: true,
    headerMap: { date: ['data'], desc: ['hist', 'descri', 'lan'], valor: ['valor', 'vlr'] },
  })
}
function _parseNubankCsv(text: string) {
  return _parseCsvCommon(text, {
    formato: 'nubank-csv', sep: ',', dateCol: 0, descCol: 2, valorCol: 3,
    hasHeader: true,
    headerMap: { date: ['data', 'date'], desc: ['t[ií]tulo', 'titulo', 'descri', 'description'], valor: ['valor', 'amount', 'value'] },
  })
}
function _parseFaturaNubank(text: string) {
  return _parseCsvCommon(text, {
    formato: 'fatura-nubank', sep: ',', dateCol: 0, descCol: 1, valorCol: 2,
    hasHeader: true, fatura: true,
    headerMap: { date: ['date', 'data'], desc: ['title', 't[ií]tulo', 'titulo', 'descri'], valor: ['amount', 'valor', 'value'] },
  })
}
function _parseFaturaGenerico(text: string) {
  const lines = _splitLines(text).filter((l) => l.trim().length > 0)
  if (!lines.length) return { formato: 'fatura-generico' as ParseFormato, transacoes: [], totalLinhas: 0, warnings: [], errors: ['Arquivo vazio'] }
  const sep = _detectSeparator(lines[0] + '\n' + (lines[1] || ''))
  const firstCols = _parseCsvLine(lines[0], sep).map((h) => h.toLowerCase())
  const hasHeader = firstCols.some((c) => /data|date|hist|descri|description|valor|amount|value|t[ií]tulo|titulo|estabelec/i.test(c))
  const result = _parseCsvCommon(text, {
    formato: 'fatura-generico', sep,
    dateCol: hasHeader ? -1 : 0, descCol: hasHeader ? -1 : 1, valorCol: hasHeader ? -1 : 2,
    hasHeader, fatura: true,
    headerMap: {
      date: ['data', 'date'],
      desc: ['descri', 'description', 'hist', 't[ií]tulo', 'titulo', 'memo', 'lan', 'estabelec'],
      valor: ['valor', 'amount', 'value', 'vlr'],
    },
  })
  result.warnings.unshift('Fatura de cartão — lançamentos tratados como despesas (exceto pagamentos/estornos)')
  return result
}

function _parseCsvGenerico(text: string) {
  const lines = _splitLines(text).filter((l) => l.trim().length > 0)
  if (!lines.length) return { formato: 'csv-generico' as ParseFormato, transacoes: [], totalLinhas: 0, warnings: [], errors: ['Arquivo vazio'] }
  const sep = _detectSeparator(lines[0] + '\n' + (lines[1] || ''))
  const firstCols = _parseCsvLine(lines[0], sep).map((h) => h.toLowerCase())
  const hasHeader = firstCols.some((c) => /data|date|hist|descri|description|valor|amount|value|t[ií]tulo|titulo/i.test(c))
  const result = _parseCsvCommon(text, {
    formato: 'csv-generico', sep,
    dateCol: hasHeader ? -1 : 0, descCol: hasHeader ? -1 : 1, valorCol: hasHeader ? -1 : 2,
    hasHeader,
    headerMap: {
      date: ['data', 'date'],
      desc: ['descri', 'description', 'hist', 't[ií]tulo', 'titulo', 'memo', 'lan'],
      valor: ['valor', 'amount', 'value', 'vlr'],
    },
  })
  result.warnings.unshift('Formato genérico detectado — confira o mapeamento de colunas')
  return result
}

function _detectFormat(text: string): ParseFormato {
  const head = _stripBOM(String(text || '')).slice(0, 2048)
  if (/<OFX|OFXHEADER|<STMTTRN>/i.test(head)) return 'ofx'
  if (/^\s*"?date"?\s*,\s*"?title"?\s*,\s*"?amount"?/i.test(head)) return 'fatura-nubank'
  if (/data\s*,\s*categoria\s*,\s*(t[ií]tulo|titulo)\s*,\s*valor/i.test(head)) return 'nubank-csv'
  if (/data\s*;\s*hist[oó]rico\s*;\s*valor/i.test(head) || (/;/.test(head) && /\d{2}\/\d{2}\/\d{4}.*;/.test(head))) return 'itau-csv'
  return 'csv-generico'
}

export function parseExtrato(args: { tipo?: ParseFormato; conteudo: string }): ParseResult {
  const out: ParseResult = {
    ok: false, formato: null, totalLinhas: 0, totalReconhecidas: 0, ignoradas: 0,
    transacoes: [],
    summary: { periodo: { inicio: null, fim: null }, totalDespesas: 0, totalReceitas: 0, saldoLiquido: 0, porCategoriaProvisoria: {} },
    warnings: [], errors: [],
  }
  if (typeof args.conteudo !== 'string' || !args.conteudo.trim()) {
    out.errors.push('Conteúdo vazio ou inválido')
    return out
  }
  const fmt: ParseFormato = (args.tipo && args.tipo !== 'auto') ? args.tipo : _detectFormat(args.conteudo)
  let parsed
  try {
    if (fmt === 'ofx') parsed = _parseOFX(args.conteudo)
    else if (fmt === 'fatura-nubank') parsed = _parseFaturaNubank(args.conteudo)
    else if (fmt === 'fatura' || fmt === 'fatura-generico') parsed = _parseFaturaGenerico(args.conteudo)
    else if (fmt === 'itau-csv') parsed = _parseItauCsv(args.conteudo)
    else if (fmt === 'nubank-csv') parsed = _parseNubankCsv(args.conteudo)
    else parsed = _parseCsvGenerico(args.conteudo)
  } catch (e) {
    out.errors.push('Falha ao parsear: ' + (e instanceof Error ? e.message : String(e)))
    out.formato = fmt
    return out
  }
  out.formato = parsed.formato
  out.transacoes = parsed.transacoes
  out.totalLinhas = parsed.totalLinhas || 0
  out.totalReconhecidas = parsed.transacoes.length
  out.ignoradas = Math.max(0, out.totalLinhas - out.totalReconhecidas)
  out.warnings = parsed.warnings || []
  out.errors = parsed.errors || []

  const seen = new Map<string, number>()
  let inicio: string | null = null, fim: string | null = null
  let totalDesp = 0, totalRec = 0
  const porCat: Record<string, number> = {}
  parsed.transacoes.forEach((tx, i) => {
    if (!inicio || tx.data < inicio) inicio = tx.data
    if (!fim || tx.data > fim) fim = tx.data
    if (tx.valor < 0) totalDesp += Math.abs(tx.valor)
    else totalRec += tx.valor
    const key = tx.data + '|' + tx.valor.toFixed(2) + '|' + (tx.descricao || '').toLowerCase().trim()
    if (seen.has(key)) out.warnings.push('possível duplicata: linha ' + (seen.get(key)! + 1) + ' e ' + (i + 1))
    else seen.set(key, i)
    const c = tx.sugestaoCategoria || 'nao_categorizado'
    porCat[c] = (porCat[c] || 0) + Math.abs(tx.valor)
  })
  out.summary.periodo.inicio = inicio
  out.summary.periodo.fim = fim
  out.summary.totalDespesas = Math.round(totalDesp * 100) / 100
  out.summary.totalReceitas = Math.round(totalRec * 100) / 100
  out.summary.saldoLiquido = Math.round((totalRec - totalDesp) * 100) / 100
  out.summary.porCategoriaProvisoria = porCat
  out.ok = out.errors.length === 0 && out.totalReconhecidas > 0
  return out
}
