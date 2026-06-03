// Knowledgebase da IA de conciliação.
// Combina dois níveis: (1) KB pessoal aprendido a partir das escolhas do
// usuário, com prioridade máxima; (2) dicionário genérico de keywords BR,
// portado do Dino (app/js/app.js IA_KEYWORDS) e usado como fallback.

import type { IaKnowledge, IaKnowledgeEntry } from './types'

interface KeywordEntry {
  kws: readonly string[]
  cat: string
  sub: string
}

/** Dicionário genérico de keywords (PT-BR). Usado quando o KB pessoal não casa. */
export const IA_KEYWORDS: readonly KeywordEntry[] = [
  // MORADIA
  { kws: ['aluguel', 'imobiliaria'], cat: 'moradia', sub: 'Aluguel' },
  { kws: ['condominio', 'taxa condominial'], cat: 'moradia', sub: 'Condomínio' },
  { kws: ['energia', 'luz', 'cemig', 'cpfl', 'coelba', 'enel', 'elektro', 'light', 'celesc', 'copel', 'eletropaulo', 'equatorial', 'energisa'], cat: 'moradia', sub: 'Energia Elétrica' },
  { kws: ['agua', 'saneamento', 'sabesp', 'copasa', 'embasa', 'cedae', 'caesb', 'sanepar', 'corsan', 'casan', 'cagece', 'compesa'], cat: 'moradia', sub: 'Água e Saneamento' },
  { kws: ['gas natural', 'comgas', 'ultragaz', 'liquigas', 'botijao'], cat: 'moradia', sub: 'Gás' },
  { kws: ['internet', 'wi-fi', 'wifi', 'banda larga', 'vivo fibra', 'claro net', 'oi fibra', 'tim live', 'algar', 'sercomtel'], cat: 'moradia', sub: 'Internet' },
  { kws: ['tv a cabo', 'sky', 'directv', 'net combo', 'vivo tv'], cat: 'moradia', sub: 'TV' },
  { kws: ['telefone fixo', 'telefonia fixa'], cat: 'moradia', sub: 'Telefone' },
  { kws: ['portaria', 'seguranca', 'cameras', 'monitoramento'], cat: 'moradia', sub: 'Segurança' },
  { kws: ['reforma', 'reparo', 'manutencao residencial', 'pintura', 'encanador', 'eletricista', 'marido de aluguel', 'pedreiro', 'diarista', 'faxina'], cat: 'moradia', sub: 'Reparos e Manutenção' },
  { kws: ['movel', 'moveis', 'sofa', 'armario', 'cama', 'colchao', 'geladeira', 'fogao', 'tok stok', 'etna', 'mobly', 'madeira madeira', 'leroy merlin'], cat: 'moradia', sub: 'Móveis e Decoração' },
  // ALIMENTAÇÃO
  { kws: ['supermercado', 'mercado', 'carrefour', 'extra', 'walmart', 'atacadao', 'assai', 'pao de acucar', 'sams club', 'dia', 'grupo pao', 'bistek', 'st marche', 'natural da terra', 'zona sul'], cat: 'alimentacao', sub: 'Supermercado' },
  { kws: ['hortifruti', 'feira', 'sacolao', 'horta', 'verdura', 'quitanda', 'sitio'], cat: 'alimentacao', sub: 'Hortifruti' },
  { kws: ['padaria', 'confeitaria', 'pao', 'cafe'], cat: 'alimentacao', sub: 'Padaria' },
  { kws: ['acougue', 'carne', 'churrasco', 'frigorifico', 'peixaria'], cat: 'alimentacao', sub: 'Açougue' },
  { kws: ['agua mineral', 'galao agua', 'galao de agua', 'minalba', 'crystal'], cat: 'alimentacao', sub: 'Água' },
  { kws: ['ifood', 'rappi', 'uber eats', 'ze delivery', 'delivery', 'aiqfome'], cat: 'alimentacao', sub: 'Delivery' },
  // TRANSPORTE
  { kws: ['combustivel', 'gasolina', 'etanol', 'diesel', 'posto shell', 'posto ipiranga', 'posto br', 'posto petrobras', 'br mania', 'raizen', 'rede ale', 'posto ale'], cat: 'transporte', sub: 'Combustível' },
  { kws: ['oficina', 'mecanico', 'revisao', 'pneu', 'borracheiro', 'autocenter', 'funilaria'], cat: 'transporte', sub: 'Manutenção' },
  { kws: ['estacionamento', 'parking', 'zona azul', 'estapar', 'multipark'], cat: 'transporte', sub: 'Estacionamento' },
  { kws: ['pedagio', 'sem parar', 'ccr', 'autoban', 'conectcar', 'veloe'], cat: 'transporte', sub: 'Pedágio' },
  { kws: ['uber', '99', '99 pop', 'cabify', 'indriver', 'taxi', 'blablacar'], cat: 'transporte', sub: 'App de Mobilidade' },
  { kws: ['metro', 'onibus', 'bilhete unico', 'bus', 'vlt', 'brt', 'viacao', 'passagem onibus', 'transporte coletivo'], cat: 'transporte', sub: 'Transporte Público' },
  { kws: ['localiza', 'movida', 'unidas', 'rentcars', 'carsharing', 'aluguel carro', 'aluguel de carro', 'turo'], cat: 'transporte', sub: 'Aluguel / Carsharing' },
  // SAÚDE
  { kws: ['unimed', 'amil', 'bradesco saude', 'hapvida', 'sulamerica', 'sul america', 'notredame', 'intermedica', 'prevent senior', 'golden cross', 'plano de saude'], cat: 'saude', sub: 'Plano de Saúde' },
  { kws: ['consulta', 'consultorio', 'clinica'], cat: 'saude', sub: 'Consultas' },
  { kws: ['exame', 'laboratorio', 'fleury', 'hermes pardini', 'dasa', 'sabin', 'delboni', 'salomao zoppi'], cat: 'saude', sub: 'Exames' },
  { kws: ['farmacia', 'drogaria', 'droga', 'medicamento', 'remedio', 'drogasil', 'pacheco', 'raia', 'pague menos', 'panvel', 'araujo'], cat: 'saude', sub: 'Medicamentos' },
  { kws: ['psicologo', 'psicologa', 'terapia', 'psicanalise', 'psiquiatra', 'analise'], cat: 'saude', sub: 'Terapia' },
  { kws: ['academia', 'smart fit', 'smartfit', 'bodytech', 'crossfit', 'bio ritmo', 'les cinq gym', 'pilates', 'yoga', 'natacao', 'muay thai', 'jiu jitsu'], cat: 'saude', sub: 'Academia / Atividade Física' },
  { kws: ['dentista', 'odonto', 'ortodontia', 'odontoprev', 'odontologico'], cat: 'saude', sub: 'Dentista' },
  { kws: ['pronto socorro', 'emergencia', 'hospital', 'samu', 'ambulancia'], cat: 'saude', sub: 'Emergências' },
  // EDUCAÇÃO
  { kws: ['mensalidade escolar', 'colegio', 'ensino infantil', 'ensino fundamental', 'ensino medio'], cat: 'educacao', sub: 'Mensalidade Escolar' },
  { kws: ['faculdade', 'universidade', 'unip', 'uninove', 'anhembi', 'estacio', 'usp', 'unicamp', 'puc', 'mackenzie', 'fgv', 'ibmec', 'insper', 'mensalidade faculdade'], cat: 'educacao', sub: 'Mensalidade Faculdade' },
  { kws: ['mba', 'mestrado', 'doutorado', 'pos-graduacao', 'pos graduacao', 'especializacao'], cat: 'educacao', sub: 'Pós-graduação / MBA' },
  { kws: ['curso', 'udemy', 'coursera', 'alura', 'rocketseat', 'hotmart', 'origamid', 'curso livre'], cat: 'educacao', sub: 'Cursos Livres' },
  { kws: ['ingles', 'espanhol', 'idioma', 'cna', 'cultura inglesa', 'wizard', 'wise up', 'fisk', 'yazigi', 'duolingo'], cat: 'educacao', sub: 'Idiomas' },
  { kws: ['material escolar', 'caderno', 'lapis', 'caneta', 'mochila', 'kuhlmann', 'kalunga'], cat: 'educacao', sub: 'Material Escolar/Universitário' },
  { kws: ['uniforme', 'uniforme escolar'], cat: 'educacao', sub: 'Uniforme' },
  { kws: ['livro', 'apostila', 'saraiva', 'amazon livros', 'livraria', 'cultura'], cat: 'educacao', sub: 'Livros e Apostilas' },
  // FINANCEIRO
  { kws: ['tarifa bancaria', 'tarifa', 'manutencao conta', 'iof'], cat: 'financeiro', sub: 'Taxas Bancárias' },
  { kws: ['saque', 'saque banco24h', 'banco 24h', 'saque atm'], cat: 'financeiro', sub: 'Saques' },
  { kws: ['anuidade cartao', 'anuidade'], cat: 'financeiro', sub: 'Anuidade de Cartão' },
  { kws: ['taxa custodia', 'taxa corretagem', 'corretagem'], cat: 'financeiro', sub: 'Tarifas de Investimento' },
  { kws: ['seguro vida', 'metlife', 'prudential', 'icatu', 'mongeral'], cat: 'financeiro', sub: 'Seguro de Vida' },
  { kws: ['seguro auto', 'seguro veicular', 'porto seguro auto', 'azul seguros', 'allianz auto', 'liberty auto', 'suhai'], cat: 'financeiro', sub: 'Seguro Veicular' },
  { kws: ['seguro residencial', 'seguro casa', 'seguro imovel'], cat: 'financeiro', sub: 'Seguro Residencial' },
  { kws: ['iptu'], cat: 'financeiro', sub: 'IPTU' },
  { kws: ['ipva', 'licenciamento', 'dpvat'], cat: 'financeiro', sub: 'IPVA / Licenciamento' },
  { kws: ['imposto de renda', 'irpf', 'darf', 'dctf'], cat: 'financeiro', sub: 'Imposto de Renda' },
  { kws: ['das', 'simples nacional', 'taxa pj', 'contribuicao pj'], cat: 'financeiro', sub: 'Taxas PJ' },
  { kws: ['multa', 'multas', 'denatran', 'detran', 'infracao'], cat: 'financeiro', sub: 'Multas' },
  { kws: ['cartorio', 'reconhecimento firma', 'autenticacao', 'documento'], cat: 'financeiro', sub: 'Cartório / Documentos' },
  // LAZER
  { kws: ['restaurante', 'almoco', 'jantar', 'pizzaria', 'pizza', 'sushi', 'japones', 'hamburgueria', 'hamburguer', 'mc donalds', 'mcdonalds', 'burger king', 'bk', 'subway', 'outback', 'coco bambu', 'madero', 'china in box', 'spoleto', 'giraffas', 'habibs', 'rascal', 'fogo de chao', 'chiquinho sorvetes'], cat: 'lazer', sub: 'Restaurante' },
  { kws: ['doceria', 'sorvete', 'gelato', 'starbucks', 'kopenhagen', 'cacau show', 'brigaderia', 'chocolate', 'sorveteria', 'lanchonete'], cat: 'lazer', sub: 'Doceria / Lanchonete' },
  { kws: ['bar', 'balada', 'boteco', 'pub', 'cerveja', 'chopp', 'choperia', 'nightclub'], cat: 'lazer', sub: 'Bar / Balada' },
  { kws: ['cinema', 'teatro', 'show', 'ingresso', 'eventim', 'sympla', 'ingresso.com', 'cinemark', 'kinoplex', 'uci'], cat: 'lazer', sub: 'Entretenimento' },
  { kws: ['netflix', 'hbo', 'max', 'hbomax', 'disney', 'disney+', 'disney plus', 'star+', 'star plus', 'prime video', 'amazon prime', 'globoplay', 'globo play', 'paramount', 'apple tv', 'spotify', 'deezer', 'tidal', 'youtube premium', 'crunchyroll'], cat: 'lazer', sub: 'Entretenimento' },
  { kws: ['playstation', 'xbox', 'steam', 'nintendo', 'epic games', 'gog', 'psn', 'xbox live', 'game pass'], cat: 'lazer', sub: 'Hobbies' },
  { kws: ['aposta', 'apostas', 'bet', 'blaze', 'bet365', 'sportingbet', 'betano', 'rivalry', 'loteria', 'mega sena', 'lotofacil', 'quina'], cat: 'lazer', sub: 'Jogos / Apostas' },
  { kws: ['viagem', 'viagens', 'hotel', 'airbnb', 'hospedagem', 'pousada', 'passagem aerea', 'voo', 'decolar', 'latam', 'gol', 'azul', 'tap', 'booking', 'expedia', 'hotels.com', 'trivago', 'kayak', '123milhas'], cat: 'lazer', sub: 'Viagens' },
  // PESSOAL
  { kws: ['cabelo', 'salao', 'cabeleireiro', 'manicure', 'pedicure', 'estetica', 'spa', 'barbearia', 'barber', 'depilacao'], cat: 'pessoal', sub: 'Salão de Beleza' },
  { kws: ['roupa', 'calcado', 'tenis', 'vestuario', 'zara', 'renner', 'riachuelo', 'c&a', 'c & a', 'hm', 'h&m', 'marisa', 'farm', 'reserva', 'adidas', 'nike', 'puma', 'mercado livre', 'amazon', 'magalu', 'americanas', 'shopee', 'shein', 'aliexpress'], cat: 'pessoal', sub: 'Vestuário' },
  { kws: ['higiene', 'shampoo', 'sabonete', 'creme', 'desodorante', 'perfume', 'cosmetico', 'natura', 'o boticario', 'sephora', 'beleza na web'], cat: 'pessoal', sub: 'Higiene Pessoal' },
  { kws: ['conta celular', 'tim', 'claro', 'vivo', 'oi', 'nextel', 'algar movel', 'tim controle', 'vivo controle', 'nubank celular', 'recarga'], cat: 'pessoal', sub: 'Celular' },
  { kws: ['presente', 'gift', 'aniversario', 'natal', 'dia das maes', 'dia dos pais'], cat: 'pessoal', sub: 'Presentes' },
  { kws: ['apple', 'icloud', 'google one', 'google storage', 'microsoft 365', 'office 365', 'chatgpt', 'openai', 'claude', 'anthropic', 'dropbox', 'notion', 'linkedin premium'], cat: 'pessoal', sub: 'Outros' },
  // APOIO FINANCEIRO
  { kws: ['mesada'], cat: 'apoio_financeiro', sub: 'Mesada' },
  { kws: ['ajuda familia', 'transferencia familia', 'mae', 'pai', 'filho', 'filha', 'irma', 'irmao'], cat: 'apoio_financeiro', sub: 'Familiares' },
  { kws: ['doacao', 'igreja', 'dizimo', 'ong', 'unicef', 'medicos sem fronteiras'], cat: 'apoio_financeiro', sub: 'Instituições' },
]

const MIN_KEY_LEN = 3
const MIN_OVERLAP_LEN = 6
const MAX_KB_ENTRIES = 500

/** Normaliza descrição pra chave do KB: lowercase + sem acento + espaços colapsados. */
export function normalizeDescription(desc: string): string {
  return (desc ?? '')
    .toLowerCase()
    .normalize('NFD')
    // remove diacríticos
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CategorySuggestion {
  category: string
  sub?: string
  source: 'knowledge' | 'keywords'
  confidence: number
}

/** Casa a descrição contra o KB pessoal. Prioriza match exato; depois substring
 *  com overlap mínimo de 6 chars. Em empate, ganha entry com maior count. */
export function suggestCategoryFromKB(
  desc: string,
  kb: IaKnowledge | undefined,
): (CategorySuggestion & { source: 'knowledge' }) | null {
  if (!kb) return null
  const norm = normalizeDescription(desc)
  if (!norm) return null

  // 1) Match exato
  const exact = kb[norm]
  if (exact) {
    return {
      category: exact.category,
      sub: exact.sub,
      source: 'knowledge',
      confidence: exact.confidence,
    }
  }

  // 2) Substring com overlap >= MIN_OVERLAP_LEN. Em empate, ganha o maior count;
  //    depois, maior confidence; depois, key mais longa (mais específica).
  let best: { key: string; entry: IaKnowledgeEntry } | null = null
  for (const key of Object.keys(kb)) {
    if (key.length < MIN_KEY_LEN) continue
    const overlap = Math.min(key.length, norm.length)
    if (overlap < MIN_OVERLAP_LEN) continue
    if (!norm.includes(key) && !key.includes(norm)) continue
    const entry = kb[key]
    if (!entry) continue
    if (!best) { best = { key, entry }; continue }
    if (
      entry.count > best.entry.count ||
      (entry.count === best.entry.count && entry.confidence > best.entry.confidence) ||
      (entry.count === best.entry.count && entry.confidence === best.entry.confidence && key.length > best.key.length)
    ) {
      best = { key, entry }
    }
  }
  if (best) {
    return {
      category: best.entry.category,
      sub: best.entry.sub,
      source: 'knowledge',
      confidence: best.entry.confidence,
    }
  }
  return null
}

/** Casa a descrição contra o dicionário genérico (fallback). */
export function suggestCategoryFromKeywords(desc: string): (CategorySuggestion & { source: 'keywords' }) | null {
  const norm = normalizeDescription(desc)
  if (!norm) return null
  for (const entry of IA_KEYWORDS) {
    if (entry.kws.some((kw) => norm.includes(kw))) {
      return { category: entry.cat, sub: entry.sub, source: 'keywords', confidence: 0.5 }
    }
  }
  return null
}

/** Sugestão combinada: KB pessoal tem prioridade, keywords genéricas como fallback. */
export function suggestCategory(
  desc: string,
  kb: IaKnowledge | undefined,
): CategorySuggestion | null {
  return suggestCategoryFromKB(desc, kb) ?? suggestCategoryFromKeywords(desc)
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Evict mantém o KB sob MAX_KB_ENTRIES — dropa entradas fracas (low confidence,
 *  low count, mais antigas). Idempotente: se o tamanho já está OK, retorna como está. */
function evictIfNeeded(kb: IaKnowledge): IaKnowledge {
  const keys = Object.keys(kb)
  if (keys.length <= MAX_KB_ENTRIES) return kb
  // Score baixo = candidato a remoção. Ordena por score asc e remove o excesso.
  const scored = keys.map((k) => {
    const e = kb[k]
    const ts = Date.parse(e.updatedAt) || 0
    // weak signal: confidence < 0.5 ou count <= 1
    const weak = (e.confidence < 0.5 ? 1 : 0) + (e.count <= 1 ? 1 : 0)
    // ordem composta: menos weak primeiro vai pra cauda; weak vai pra frente
    return { k, score: -weak * 1e15 + ts, weak, count: e.count, conf: e.confidence }
  })
  scored.sort((a, b) => a.score - b.score)
  const toDrop = scored.length - MAX_KB_ENTRIES
  const next: IaKnowledge = {}
  const dropSet = new Set(scored.slice(0, toDrop).map((x) => x.k))
  for (const k of keys) {
    if (!dropSet.has(k)) next[k] = kb[k]
  }
  return next
}

/** Registra uma escolha explícita (usuário criou/editou com categoria definida).
 *  Se entry existe com mesma categoria/sub: incrementa count, eleva confidence.
 *  Se diferente: trata como correção implícita (sobrescreve, conf=1.0, count=1). */
export function recordCategoryChoice(
  kb: IaKnowledge | undefined,
  desc: string,
  category: string,
  sub: string | undefined,
): IaKnowledge {
  const norm = normalizeDescription(desc)
  if (!norm || norm.length < MIN_KEY_LEN || !category) return kb ?? {}
  const base: IaKnowledge = { ...(kb ?? {}) }
  const prev = base[norm]
  const same = prev && prev.category === category && (prev.sub ?? undefined) === (sub ?? undefined)
  const next: IaKnowledgeEntry = same && prev
    ? {
        category,
        sub,
        count: prev.count + 1,
        confidence: Math.min(1, prev.confidence + 0.1),
        updatedAt: nowIso(),
      }
    : {
        category,
        sub,
        count: 1,
        confidence: 1,
        updatedAt: nowIso(),
      }
  base[norm] = next
  return evictIfNeeded(base)
}

/** Registra correção: usuário recebeu sugestão `suggestedCategory` mas escolheu
 *  outra. Penaliza confidence prévia e sobrescreve com a nova escolha. */
export function recordCategoryCorrection(
  kb: IaKnowledge | undefined,
  desc: string,
  suggestedCategory: string,
  acceptedCategory: string,
  acceptedSub: string | undefined,
): IaKnowledge {
  const norm = normalizeDescription(desc)
  if (!norm || norm.length < MIN_KEY_LEN || !acceptedCategory) return kb ?? {}
  const base: IaKnowledge = { ...(kb ?? {}) }
  const prev = base[norm]
  // Penalização só faz sentido se o KB anterior coincidia com a sugestão.
  if (prev && prev.category === suggestedCategory) {
    prev.confidence = Math.max(0, prev.confidence - 0.3)
  }
  base[norm] = {
    category: acceptedCategory,
    sub: acceptedSub,
    count: 1,
    confidence: 1,
    updatedAt: nowIso(),
  }
  return evictIfNeeded(base)
}
