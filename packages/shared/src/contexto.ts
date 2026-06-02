// ICP / Contexto Pessoal — porte fiel do Dino (store.js 3201+).
// 9 categorias × ~10 perguntas cada = ~77 totais (cap por categoria).
// Score: respondidas/total simples, capped por categoria.
//
// O ICP é o medidor de quanto o Coach conhece o usuário. Quanto maior,
// mais personalizadas as respostas dele. Onboarding já alimenta algumas
// categorias na hora.

export interface ContextoCategoria {
  id: string
  name: string
  icon: string
  color: string
  desc: string
  total: number
}

export interface ContextoNivel {
  min: number
  max: number
  name: string
  desc: string
  color: string
}

export interface ContextoResposta {
  perguntaId: string
  pergunta: string
  resposta: string
  opcaoId?: string | null
  extra?: string
  version: number
  ts: string // ISO
}

export interface ContextoBucket {
  respostas: ContextoResposta[]
  last: string | null
}

export type ContextoState = Record<string, ContextoBucket>

// ─── Categorias (porte literal de CONTEXTO_CATEGORIES) ─────────────
export const CONTEXTO_CATEGORIES: ContextoCategoria[] = [
  { id: 'basic',  name: 'Perfil básico',         icon: 'user',      color: '#6b5ef5', desc: 'Nome, foto, fuso, idioma',                        total: 5  },
  { id: 'onbo',   name: 'Onboarding inicial',    icon: 'flag',      color: '#4aa8ff', desc: 'Suas respostas no setup do app',                   total: 15 },
  { id: 'money',  name: 'Relação com dinheiro',  icon: 'brain',     color: '#b06ef5', desc: 'Crenças, traumas, mindset financeiro',             total: 10 },
  { id: 'dreams', name: 'Objetivos de vida',     icon: 'compass',   color: '#2dcfc0', desc: 'Sonhos, metas pessoais, propósito',                total: 10 },
  { id: 'family', name: 'Família & responsab.',  icon: 'users',     color: '#ff70b8', desc: 'Dependentes, projetos com a família',              total: 8  },
  { id: 'career', name: 'Carreira & renda',      icon: 'briefcase', color: '#ffa930', desc: 'Estabilidade, ambições, transição',                total: 10 },
  { id: 'risk',   name: 'Tolerância a risco',    icon: 'scale',     color: '#ff4a68', desc: 'Como você decide diante de incerteza',             total: 10 },
  { id: 'values', name: 'Valores & prioridades', icon: 'star',      color: '#1dc97e', desc: 'O que importa de verdade pra você',                total: 8  },
  { id: 'health', name: 'Saúde & bem-estar',     icon: 'heart',     color: '#4aa8ff', desc: 'Impactos indiretos no seu orçamento',              total: 6  },
]

// ─── Níveis (porte literal de CONTEXTO_LEVELS) ─────────────────────
export const CONTEXTO_LEVELS: ContextoNivel[] = [
  { min: 0,  max: 20,  name: 'Recém-chegado', desc: 'O Haile ainda não te conhece. As sugestões são genéricas.', color: '#7c82a4' },
  { min: 21, max: 40,  name: 'Apresentado',   desc: 'O Haile sabe o básico. Já adapta o tom à sua família.',     color: '#4aa8ff' },
  { min: 41, max: 65,  name: 'Conhecido',     desc: 'O Haile personaliza dicas usando seu histórico e contexto.',color: '#6b5ef5' },
  { min: 66, max: 85,  name: 'Próximo',       desc: 'O Haile antecipa decisões com base nos seus valores.',      color: '#2dcfc0' },
  { min: 86, max: 100, name: 'Confidente',    desc: 'O Haile age como um mentor que te conhece de verdade.',     color: '#1dc97e' },
]

// ─── Helpers puros (operam em ContextoState) ───────────────────────

/** Categorias enriquecidas com contagens da state atual. */
export function getContextoCategoriasComContagem(
  ctx: ContextoState | undefined | null,
): Array<ContextoCategoria & { answered: number; last: string | null }> {
  const c = ctx ?? {}
  return CONTEXTO_CATEGORIES.map((cat) => {
    const bucket = c[cat.id]
    return {
      ...cat,
      answered: Math.min(bucket?.respostas?.length ?? 0, cat.total),
      last: bucket?.last ?? null,
    }
  })
}

/** ICP em %, fiel ao Dino: soma_respondidas_capped / soma_totais. */
export function calculateICP(ctx: ContextoState | undefined | null): number {
  const c = ctx ?? {}
  let answered = 0
  let total = 0
  for (const cat of CONTEXTO_CATEGORIES) {
    const r = c[cat.id]?.respostas?.length ?? 0
    answered += Math.min(r, cat.total)
    total += cat.total
  }
  return total > 0 ? Math.round((answered / total) * 100) : 0
}

/** Retorna o nível atual baseado no %. */
export function getContextoLevel(pct: number): ContextoNivel {
  return CONTEXTO_LEVELS.find((l) => pct >= l.min && pct <= l.max) ?? CONTEXTO_LEVELS[0]
}

/** Próximo nível ou null se já é Confidente. */
export function getContextoNextLevel(pct: number): ContextoNivel | null {
  const atual = getContextoLevel(pct)
  const idx = CONTEXTO_LEVELS.indexOf(atual)
  return CONTEXTO_LEVELS[idx + 1] ?? null
}

/** Aplica uma resposta no bucket da categoria. Resposta vazia REMOVE.
 *  Retorna o NOVO ContextoState (imutável). */
export function aplicarResposta(
  ctx: ContextoState | undefined | null,
  categoriaId: string,
  resp: Partial<ContextoResposta> & { perguntaId: string },
): ContextoState {
  const next: ContextoState = { ...(ctx ?? {}) }
  const bucket: ContextoBucket = next[categoriaId]
    ? { ...next[categoriaId], respostas: [...(next[categoriaId].respostas ?? [])] }
    : { respostas: [], last: null }

  const respostaTexto = (resp.resposta ?? '').trim()
  // Vazia = remover
  if (!respostaTexto) {
    bucket.respostas = bucket.respostas.filter((r) => r.perguntaId !== resp.perguntaId)
    bucket.last = bucket.respostas.length > 0
      ? bucket.respostas[bucket.respostas.length - 1].resposta
      : null
    next[categoriaId] = bucket
    return next
  }

  const idx = bucket.respostas.findIndex((r) => r.perguntaId === resp.perguntaId)
  const entry: ContextoResposta = {
    perguntaId: resp.perguntaId,
    pergunta: resp.pergunta ?? '',
    resposta: respostaTexto,
    opcaoId: resp.opcaoId ?? null,
    extra: resp.extra ?? '',
    version: resp.version ?? 1,
    ts: new Date().toISOString(),
  }
  if (idx >= 0) bucket.respostas[idx] = entry
  else bucket.respostas.push(entry)
  bucket.last = respostaTexto
  next[categoriaId] = bucket
  return next
}

export function getRespostas(
  ctx: ContextoState | undefined | null,
  categoriaId: string,
): ContextoResposta[] {
  return (ctx?.[categoriaId]?.respostas ?? []).slice()
}

export function getAnsweredIds(
  ctx: ContextoState | undefined | null,
  categoriaId: string,
): string[] {
  return (ctx?.[categoriaId]?.respostas ?? []).map((r) => r.perguntaId)
}

// ─── Banco mínimo de perguntas (3 por categoria pro MVP) ───────────
// Backlog: expandir pra ~10 por categoria (90 total). Aqui é o seed.
export interface PerguntaSpec {
  id: string
  categoria: string
  pergunta: string
  opcoes: Array<{ id: string; label: string }>
  permiteExtra?: boolean
}

export const PERGUNTAS_BANCO: PerguntaSpec[] = [
  // money — relação com dinheiro
  { id: 'money_emocao', categoria: 'money', pergunta: 'Como você se sente em relação ao seu dinheiro hoje?', opcoes: [
    { id: 'tranquilo', label: 'Tranquilo(a), está sob controle' },
    { id: 'preocupado', label: 'Preocupado(a) — sinto que poderia ir melhor' },
    { id: 'ansioso', label: 'Ansioso(a) — falta clareza ou sobra' },
    { id: 'sem_pensar', label: 'Não penso muito sobre isso' },
  ]},
  { id: 'money_crenca', categoria: 'money', pergunta: 'Qual frase combina mais com o que você acredita?', opcoes: [
    { id: 'instrumento', label: 'Dinheiro é instrumento — ajuda a viver o que importa' },
    { id: 'liberdade', label: 'Dinheiro é liberdade — me dá tempo e escolhas' },
    { id: 'seguranca', label: 'Dinheiro é segurança — preciso pra dormir tranquilo' },
    { id: 'status', label: 'Dinheiro é status — gosto do que ele permite mostrar' },
  ]},
  { id: 'money_trauma', categoria: 'money', pergunta: 'Você já passou aperto financeiro sério?', opcoes: [
    { id: 'nunca', label: 'Nunca' },
    { id: 'cresceu', label: 'Cresci vendo isso em casa' },
    { id: 'eu_passei', label: 'Sim, eu já passei' },
    { id: 'agora', label: 'Estou passando agora' },
  ]},

  // dreams — objetivos
  { id: 'dreams_5anos', categoria: 'dreams', pergunta: 'Em 5 anos você quer estar...', opcoes: [
    { id: 'sem_dividas', label: 'Sem dívidas e com reserva sólida' },
    { id: 'casa_propria', label: 'Com casa própria (ou financiando uma)' },
    { id: 'aposentado_cedo', label: 'Caminho pra liberdade financeira / aposentadoria antecipada' },
    { id: 'negocio_proprio', label: 'Com negócio próprio rodando' },
  ]},
  { id: 'dreams_proximo', categoria: 'dreams', pergunta: 'E nos próximos 12 meses, qual a meta mais importante?', opcoes: [
    { id: 'reserva_emergencia', label: 'Criar / completar reserva de emergência' },
    { id: 'quitar_dividas', label: 'Quitar dívidas grandes' },
    { id: 'comecar_investir', label: 'Começar a investir de verdade' },
    { id: 'realizar_sonho', label: 'Realizar um sonho específico (viagem, curso, etc.)' },
  ], permiteExtra: true },
  { id: 'dreams_obstaculo', categoria: 'dreams', pergunta: 'O que mais te trava pra alcançar isso?', opcoes: [
    { id: 'renda', label: 'Renda é o que limita' },
    { id: 'disciplina', label: 'Falta disciplina pra seguir o plano' },
    { id: 'conhecimento', label: 'Não sei por onde começar' },
    { id: 'familia', label: 'Decisões compartilhadas dificultam' },
  ], permiteExtra: true },

  // family
  { id: 'family_dependentes', categoria: 'family', pergunta: 'Quantas pessoas dependem da sua renda?', opcoes: [
    { id: '0', label: 'Só eu' },
    { id: '1', label: '1 pessoa' },
    { id: '2_3', label: '2 ou 3' },
    { id: '4mais', label: '4 ou mais' },
  ]},
  { id: 'family_decisao', categoria: 'family', pergunta: 'Como vocês decidem coisas financeiras importantes?', opcoes: [
    { id: 'sozinho', label: 'Decido sozinho(a)' },
    { id: 'casal_conversa', label: 'Conversamos como casal e decidimos juntos' },
    { id: 'um_decide', label: 'Um decide, o outro acompanha' },
    { id: 'parcerias', label: 'Cada um cuida de uma parte' },
  ]},
  { id: 'family_filhos_educ', categoria: 'family', pergunta: 'Educação dos filhos / sobrinhos é prioridade no orçamento?', opcoes: [
    { id: 'top', label: 'É a maior prioridade' },
    { id: 'importante', label: 'Importante, mas equilibrado' },
    { id: 'nao_aplica', label: 'Não se aplica' },
  ]},

  // career
  { id: 'career_estab', categoria: 'career', pergunta: 'Quão estável é sua renda principal hoje?', opcoes: [
    { id: 'clt', label: 'CLT — entra todo mês certinho' },
    { id: 'autonomo', label: 'Autônomo / variável — alguns meses fortes, outros fracos' },
    { id: 'empreendedor', label: 'Empreendedor — risco maior, potencial maior' },
    { id: 'sem_renda', label: 'Sem renda fixa atualmente' },
  ]},
  { id: 'career_ambicao', categoria: 'career', pergunta: 'Sua ambição de carreira nos próximos anos?', opcoes: [
    { id: 'crescer', label: 'Crescer onde estou' },
    { id: 'mudar_area', label: 'Mudar de área' },
    { id: 'empreender', label: 'Empreender' },
    { id: 'desacelerar', label: 'Desacelerar / qualidade de vida' },
  ]},
  { id: 'career_renda_extra', categoria: 'career', pergunta: 'Você tem (ou planeja ter) fontes de renda além da principal?', opcoes: [
    { id: 'ja_tenho', label: 'Já tenho' },
    { id: 'planejo', label: 'Planejo ter' },
    { id: 'nao_planejo', label: 'Não, foco numa só' },
  ]},

  // risk
  { id: 'risk_perfil', categoria: 'risk', pergunta: 'Você se considera...', opcoes: [
    { id: 'conservador', label: 'Conservador(a) — segurança em primeiro' },
    { id: 'moderado', label: 'Moderado(a) — aceito risco em parte' },
    { id: 'arrojado', label: 'Arrojado(a) — busco retorno alto' },
    { id: 'depende', label: 'Depende — varia conforme o momento' },
  ]},
  { id: 'risk_perde', categoria: 'risk', pergunta: 'Se seu investimento cair 20% num mês, você...', opcoes: [
    { id: 'tira_tudo', label: 'Tira tudo na hora' },
    { id: 'analisa', label: 'Analisa antes de mexer' },
    { id: 'mantem', label: 'Mantém — faz parte do jogo' },
    { id: 'aporta_mais', label: 'Aporta mais (está barato)' },
  ]},
  { id: 'risk_seguro', categoria: 'risk', pergunta: 'Como você se sente em relação a seguros (vida, auto, saúde)?', opcoes: [
    { id: 'tenho_tudo', label: 'Tenho todos que considero importantes' },
    { id: 'falta_alguns', label: 'Tenho alguns, falta cobrir mais' },
    { id: 'nao_tenho', label: 'Quase nada — confio na sorte' },
  ]},

  // values
  { id: 'values_top', categoria: 'values', pergunta: 'Se você tivesse que escolher UMA coisa pra investir o seu dinheiro, seria...', opcoes: [
    { id: 'experiencias', label: 'Experiências (viagens, vivências)' },
    { id: 'familia', label: 'Família (educação, qualidade de vida deles)' },
    { id: 'futuro', label: 'Futuro (aposentadoria, segurança)' },
    { id: 'sucesso', label: 'Crescimento pessoal / negócio' },
  ]},
  { id: 'values_culpa', categoria: 'values', pergunta: 'Em que tipo de gasto você sente CULPA?', opcoes: [
    { id: 'lazer', label: 'Lazer / entretenimento' },
    { id: 'comida_fora', label: 'Comer fora / delivery' },
    { id: 'roupas', label: 'Roupas / acessórios' },
    { id: 'nao_sinto', label: 'Não sinto culpa — gasto é gasto' },
  ]},

  // health
  { id: 'health_saude', categoria: 'health', pergunta: 'Saúde / academia / terapia fazem parte do seu orçamento?', opcoes: [
    { id: 'sim_caro', label: 'Sim, e é uma despesa relevante' },
    { id: 'sim_basico', label: 'Sim, no básico (plano de saúde / SUS)' },
    { id: 'gostaria', label: 'Gostaria de incluir, hoje não cabe' },
    { id: 'nao_pra', label: 'Não, não é prioridade agora' },
  ]},
  { id: 'health_imprevisto', categoria: 'health', pergunta: 'Se aparecer um imprevisto médico grande agora, você...', opcoes: [
    { id: 'reserva', label: 'Tenho reserva pra isso' },
    { id: 'plano', label: 'Plano de saúde cobre' },
    { id: 'familia_ajuda', label: 'Família ajudaria' },
    { id: 'precisaria', label: 'Precisaria recorrer a crédito' },
  ]},
]

export function perguntasPendentes(
  ctx: ContextoState | undefined | null,
  categoriaId?: string,
): PerguntaSpec[] {
  const todas = categoriaId
    ? PERGUNTAS_BANCO.filter((p) => p.categoria === categoriaId)
    : PERGUNTAS_BANCO
  const respondidas = new Set<string>()
  for (const cat of CONTEXTO_CATEGORIES) {
    for (const id of getAnsweredIds(ctx, cat.id)) respondidas.add(id)
  }
  return todas.filter((p) => !respondidas.has(p.id))
}
