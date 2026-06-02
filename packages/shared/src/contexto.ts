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
  { id: 'onbo',   name: 'Onboarding inicial',    icon: 'flag',      color: '#4aa8ff', desc: 'Suas respostas no setup do app',                   total: 10 },
  { id: 'money',  name: 'Relação com dinheiro',  icon: 'brain',     color: '#b06ef5', desc: 'Crenças, traumas, mindset financeiro',             total: 14 },
  { id: 'dreams', name: 'Objetivos de vida',     icon: 'compass',   color: '#2dcfc0', desc: 'Sonhos, metas pessoais, propósito',                total: 12 },
  { id: 'family', name: 'Família & responsab.',  icon: 'users',     color: '#ff70b8', desc: 'Dependentes, projetos com a família',              total: 10 },
  { id: 'career', name: 'Carreira & renda',      icon: 'briefcase', color: '#ffa930', desc: 'Estabilidade, ambições, transição',                total: 12 },
  { id: 'risk',   name: 'Tolerância a risco',    icon: 'scale',     color: '#ff4a68', desc: 'Como você decide diante de incerteza',             total: 10 },
  { id: 'values', name: 'Valores & prioridades', icon: 'star',      color: '#1dc97e', desc: 'O que importa de verdade pra você',                total: 12 },
  { id: 'health', name: 'Saúde & bem-estar',     icon: 'heart',     color: '#4aa8ff', desc: 'Impactos indiretos no seu orçamento',              total: 10 },
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

// ─── Banco de perguntas ICP — 90 entradas total ────────────────────
// Distribuição: risk 10, values 12, money 14, dreams 12, family 10,
// career 12, health 10, onbo 10. (Categoria `basic` é coberta pelo
// formulário de perfil — sem perguntas livres.)
//
// Estilo: voz Haile (orientadora, sem julgamento). Cada pergunta deve
// revelar algo acionável: tom do Coach, sugestão prioritária, exemplo
// que conecta com a vida do usuário. IDs estáveis com prefixo da
// categoria. Os 20 originais (sem sufixo numérico) seguem preservados
// pra não invalidar respostas já gravadas; os novos usam sufixo _NN.
export interface PerguntaSpec {
  id: string
  categoria: string
  pergunta: string
  opcoes: Array<{ id: string; label: string }>
  permiteExtra?: boolean
}

export const PERGUNTAS_BANCO: PerguntaSpec[] = [
  // ─── money (14) ──────────────────────────────────────────────────
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
  { id: 'money_04', categoria: 'money', pergunta: 'Quando sobra dinheiro no fim do mês, qual seu primeiro impulso?', opcoes: [
    { id: 'guardar', label: 'Guardar antes que evapore' },
    { id: 'investir', label: 'Direcionar pra um investimento' },
    { id: 'aproveitar', label: 'Aproveitar — vida é hoje' },
    { id: 'quitar', label: 'Adiantar dívida ou compromisso' },
    { id: 'fica_parado', label: 'Fica parado na conta até eu decidir' },
  ]},
  { id: 'money_05', categoria: 'money', pergunta: 'Como você costuma reagir a um gasto impulsivo?', opcoes: [
    { id: 'racionalizo', label: 'Racionalizo depois — "eu merecia"' },
    { id: 'culpa', label: 'Sinto culpa por um tempo' },
    { id: 'compenso', label: 'Tento compensar cortando outra coisa' },
    { id: 'nao_acontece', label: 'Quase não acontece — sou bem planejado(a)' },
  ]},
  { id: 'money_06', categoria: 'money', pergunta: 'Quem te ensinou (ou não ensinou) sobre dinheiro quando você era jovem?', opcoes: [
    { id: 'pais_falavam', label: 'Meus pais falavam abertamente sobre o assunto' },
    { id: 'pais_tabu', label: 'Era tabu em casa — ninguém comentava' },
    { id: 'aprendi_sozinho', label: 'Aprendi sozinho(a), errando' },
    { id: 'escola_curso', label: 'Em curso, livro ou conteúdo na internet' },
  ]},
  { id: 'money_07', categoria: 'money', pergunta: 'Você tem clareza de pra onde seu dinheiro foi no mês passado?', opcoes: [
    { id: 'detalhe', label: 'Sim, em detalhe' },
    { id: 'linhas_gerais', label: 'Linhas gerais, sem precisão' },
    { id: 'pouca_ideia', label: 'Pouca ideia — sumiu' },
    { id: 'nunca_olhei', label: 'Nunca olhei pra trás assim' },
  ]},
  { id: 'money_08', categoria: 'money', pergunta: 'Falar de dinheiro com pessoas próximas é...', opcoes: [
    { id: 'natural', label: 'Natural — converso aberto' },
    { id: 'so_parceiro', label: 'Só com parceiro(a) ou família muito próxima' },
    { id: 'evito', label: 'Evito — me sinto exposto(a)' },
    { id: 'depende_assunto', label: 'Depende do assunto e da pessoa' },
  ]},
  { id: 'money_09', categoria: 'money', pergunta: 'O que mais te dá orgulho na sua relação com dinheiro?', opcoes: [
    { id: 'disciplina', label: 'Minha disciplina pra poupar' },
    { id: 'capacidade_ganhar', label: 'Minha capacidade de gerar renda' },
    { id: 'generosidade', label: 'Minha generosidade com quem amo' },
    { id: 'lucidez', label: 'Saber distinguir o que vale a pena' },
    { id: 'nada_ainda', label: 'Nada por enquanto — quero mudar isso' },
  ]},
  { id: 'money_10', categoria: 'money', pergunta: 'E o que mais te incomoda na sua relação com dinheiro?', opcoes: [
    { id: 'falta_controle', label: 'Falta de controle / não sei pra onde vai' },
    { id: 'pouca_sobra', label: 'Sobra pouco no fim do mês' },
    { id: 'medo_futuro', label: 'Medo do futuro / não me sentir seguro(a)' },
    { id: 'comparacao', label: 'Comparar com pessoas que estão à frente' },
    { id: 'desorganizacao', label: 'Desorganização — datas, contas, papéis' },
  ]},
  { id: 'money_11', categoria: 'money', pergunta: 'Pensando nos últimos 12 meses, sua situação financeira está...', opcoes: [
    { id: 'melhor', label: 'Melhor que antes' },
    { id: 'igual', label: 'Mais ou menos igual' },
    { id: 'pior', label: 'Pior que antes' },
    { id: 'oscilou', label: 'Oscilou muito — meses bons e ruins' },
  ]},
  { id: 'money_12', categoria: 'money', pergunta: 'Com que frequência você revisa suas finanças?', opcoes: [
    { id: 'diario', label: 'Quase todo dia' },
    { id: 'semanal', label: 'Uma vez por semana' },
    { id: 'mensal', label: 'Uma vez por mês' },
    { id: 'raro', label: 'Quando algo aperta' },
    { id: 'quase_nunca', label: 'Quase nunca' },
  ]},
  { id: 'money_13', categoria: 'money', pergunta: 'Como você lida com dívidas hoje?', opcoes: [
    { id: 'sem_dividas', label: 'Não tenho — evito ao máximo' },
    { id: 'controladas', label: 'Tenho, mas estão sob controle' },
    { id: 'apertam', label: 'Tenho e elas apertam o orçamento' },
    { id: 'usa_estrategia', label: 'Uso dívida como estratégia (financiamento bom, alavancagem)' },
  ]},
  { id: 'money_14', categoria: 'money', pergunta: 'Quando o Haile te trouxer uma sugestão de mudança, o que te ajuda mais?', opcoes: [
    { id: 'numeros', label: 'Ver os números bem claros' },
    { id: 'historia', label: 'Entender a história / contexto por trás' },
    { id: 'passo_a_passo', label: 'Receber um passo a passo bem objetivo' },
    { id: 'opcoes', label: 'Ter opções pra eu escolher qual seguir' },
  ]},

  // ─── dreams (12) ─────────────────────────────────────────────────
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
  { id: 'dreams_04', categoria: 'dreams', pergunta: 'Que tipo de aposentadoria faria sentido pra você?', opcoes: [
    { id: 'parar_total', label: 'Parar totalmente cedo e viver de renda' },
    { id: 'reduzir_ritmo', label: 'Reduzir ritmo, manter algo significativo' },
    { id: 'reinventar', label: 'Reinventar carreira em algo mais leve' },
    { id: 'nao_pensei', label: 'Não pensei nisso ainda' },
  ]},
  { id: 'dreams_05', categoria: 'dreams', pergunta: 'Viajar tem peso no seu projeto de vida?', opcoes: [
    { id: 'central', label: 'Sim, é central — quero rodar o mundo' },
    { id: 'algumas', label: 'Algumas viagens marcantes ao longo da vida bastam' },
    { id: 'oportunidade', label: 'Vou quando der, sem planejar' },
    { id: 'nao_priorizo', label: 'Não é prioridade pra mim' },
  ]},
  { id: 'dreams_06', categoria: 'dreams', pergunta: 'Casa própria pra você é...', opcoes: [
    { id: 'essencial', label: 'Essencial — segurança e raiz' },
    { id: 'desejavel', label: 'Desejável, mas posso esperar' },
    { id: 'ja_tenho', label: 'Já tenho' },
    { id: 'nao_importa', label: 'Prefiro liberdade — alugar funciona pra mim' },
  ]},
  { id: 'dreams_07', categoria: 'dreams', pergunta: 'Pensando em legado, o que você gostaria de deixar?', opcoes: [
    { id: 'patrimonio', label: 'Patrimônio pros próximos' },
    { id: 'educacao', label: 'Educação e oportunidades pros filhos / sobrinhos' },
    { id: 'historia', label: 'Uma história / marca que inspirasse' },
    { id: 'causa', label: 'Contribuição pra uma causa importante' },
    { id: 'nao_pensei', label: 'Não pensei nisso ainda' },
  ]},
  { id: 'dreams_08', categoria: 'dreams', pergunta: 'Sua relação com trabalho daqui a 10 anos é...', opcoes: [
    { id: 'mesmo_motor', label: 'Quero o mesmo motor — gosto do que faço' },
    { id: 'liberdade', label: 'Trabalhar por escolha, não por obrigação' },
    { id: 'mudar_completo', label: 'Mudar completamente de rumo' },
    { id: 'parar_total', label: 'Parar de trabalhar' },
  ]},
  { id: 'dreams_09', categoria: 'dreams', pergunta: 'Tem algum sonho que você guarda há anos e nunca contou pra muita gente?', opcoes: [
    { id: 'sim_definido', label: 'Sim, e está bem nítido pra mim' },
    { id: 'sim_difuso', label: 'Sim, mas ainda meio difuso' },
    { id: 'tive_perdi', label: 'Tive um, mas deixei pra lá' },
    { id: 'nao_tenho', label: 'Não — sou mais de viver o dia' },
  ], permiteExtra: true },
  { id: 'dreams_10', categoria: 'dreams', pergunta: 'O que te faria sentir "consegui" daqui a 10 anos?', opcoes: [
    { id: 'liberdade_tempo', label: 'Liberdade pra usar meu tempo como eu quiser' },
    { id: 'familia_estavel', label: 'Família próxima e estável' },
    { id: 'realizacao_profissional', label: 'Realização profissional reconhecida' },
    { id: 'impacto', label: 'Saber que impactei vidas' },
    { id: 'paz_interna', label: 'Paz interna — sem ansiedade financeira' },
  ]},
  { id: 'dreams_11', categoria: 'dreams', pergunta: 'O Haile costuma sugerir microetapas. O que funciona melhor pra você?', opcoes: [
    { id: 'metas_curtas', label: 'Metas curtas, semanais' },
    { id: 'mensais', label: 'Marcos mensais' },
    { id: 'trimestral', label: 'Revisão trimestral, mais espaçada' },
    { id: 'anual_grande', label: 'Foco grande no ano todo, sem subdividir' },
  ]},
  { id: 'dreams_12', categoria: 'dreams', pergunta: 'Quando você imagina seu próximo grande projeto, ele exige principalmente...', opcoes: [
    { id: 'dinheiro', label: 'Mais dinheiro' },
    { id: 'tempo', label: 'Mais tempo' },
    { id: 'coragem', label: 'Mais coragem' },
    { id: 'pessoas', label: 'Mais gente certa ao redor' },
  ]},

  // ─── family (10) ─────────────────────────────────────────────────
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
  { id: 'family_04', categoria: 'family', pergunta: 'Como funciona a divisão de despesas com seu parceiro(a) hoje?', opcoes: [
    { id: 'conta_unica', label: 'Conta única, tudo junto' },
    { id: 'pro_rata', label: 'Cada um contribui proporcional à renda' },
    { id: 'metade', label: 'Tudo dividido na metade' },
    { id: 'um_paga_tudo', label: 'Um paga as contas, o outro outras coisas' },
    { id: 'solo', label: 'Sou solo / não se aplica' },
  ]},
  { id: 'family_05', categoria: 'family', pergunta: 'Você cuida financeiramente de pais ou familiares mais velhos?', opcoes: [
    { id: 'sim_total', label: 'Sim, sou o sustento principal' },
    { id: 'sim_parcial', label: 'Sim, ajudo todo mês' },
    { id: 'eventual', label: 'Eventualmente, quando precisam' },
    { id: 'nao', label: 'Não' },
  ]},
  { id: 'family_06', categoria: 'family', pergunta: 'Você e quem mora com você falam sobre dinheiro abertamente?', opcoes: [
    { id: 'sempre', label: 'Sempre — é assunto natural' },
    { id: 'as_vezes', label: 'Às vezes, quando algo aperta' },
    { id: 'evitamos', label: 'Evitamos — gera atrito' },
    { id: 'solo', label: 'Moro só' },
  ]},
  { id: 'family_07', categoria: 'family', pergunta: 'Vocês têm objetivos financeiros compartilhados ativos?', opcoes: [
    { id: 'sim_claros', label: 'Sim, bem claros' },
    { id: 'sim_vagos', label: 'Sim, mas meio vagos' },
    { id: 'nao_ainda', label: 'Não ainda — queremos ter' },
    { id: 'cada_um', label: 'Cada um tem os seus' },
    { id: 'solo', label: 'Não se aplica' },
  ]},
  { id: 'family_08', categoria: 'family', pergunta: 'Como é falar de "limite" de gasto com a família?', opcoes: [
    { id: 'tranquilo', label: 'Tranquilo — entendemos juntos' },
    { id: 'tenso', label: 'Tenso — quase sempre dá ruído' },
    { id: 'evito', label: 'Evito puxar o assunto' },
    { id: 'eu_sou_limite', label: 'Eu sou o "freio" da casa' },
  ]},
  { id: 'family_09', categoria: 'family', pergunta: 'Mesada / autonomia financeira dos filhos é tema na sua casa?', opcoes: [
    { id: 'sim_estruturado', label: 'Sim, com regras claras' },
    { id: 'sim_informal', label: 'Sim, mas informal' },
    { id: 'comecando', label: 'Estamos começando agora' },
    { id: 'nao_aplica', label: 'Não se aplica' },
  ]},
  { id: 'family_10', categoria: 'family', pergunta: 'Se você ficasse impossibilitado de trabalhar por 6 meses, sua família...', opcoes: [
    { id: 'tranquila', label: 'Ficaria tranquila — reserva cobre' },
    { id: 'apertada', label: 'Ficaria apertada, mas viraríamos' },
    { id: 'serio', label: 'Estaríamos em situação séria' },
    { id: 'nao_pensei', label: 'Nunca pensei nisso' },
  ]},

  // ─── career (12) ─────────────────────────────────────────────────
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
  { id: 'career_04', categoria: 'career', pergunta: 'Sua renda no último ano...', opcoes: [
    { id: 'subiu', label: 'Subiu acima da inflação' },
    { id: 'estavel', label: 'Ficou estável' },
    { id: 'caiu', label: 'Caiu' },
    { id: 'oscilou', label: 'Oscilou muito' },
  ]},
  { id: 'career_05', categoria: 'career', pergunta: 'Qual sua relação com o trabalho atual?', opcoes: [
    { id: 'amo', label: 'Amo o que faço' },
    { id: 'gosto', label: 'Gosto, mas é um meio' },
    { id: 'so_paga', label: 'Só paga as contas' },
    { id: 'travado', label: 'Estou travado(a) — quero mudar' },
  ]},
  { id: 'career_06', categoria: 'career', pergunta: 'Como você reage a uma oferta de emprego com salário maior mas em área diferente?', opcoes: [
    { id: 'topo', label: 'Encaro como oportunidade' },
    { id: 'analiso', label: 'Analiso bem antes — depende muito' },
    { id: 'evito_risco', label: 'Tendo a recusar pra evitar risco' },
    { id: 'nao_passou', label: 'Nunca passei por isso' },
  ]},
  { id: 'career_07', categoria: 'career', pergunta: 'Você investe (tempo/dinheiro) no seu desenvolvimento profissional?', opcoes: [
    { id: 'frequente', label: 'Sim, frequentemente' },
    { id: 'pontual', label: 'Sim, em momentos pontuais' },
    { id: 'raro', label: 'Raramente' },
    { id: 'nao', label: 'Não invisto' },
  ]},
  { id: 'career_08', categoria: 'career', pergunta: 'Se um cliente / chefe importante atrasa o pagamento, você...', opcoes: [
    { id: 'reserva_cobre', label: 'Tranquilo — reserva cobre' },
    { id: 'mexe_um_pouco', label: 'Mexe um pouco, mas vira' },
    { id: 'aperta_serio', label: 'Aperta sério' },
    { id: 'nao_aplica', label: 'Sou CLT, não acontece' },
  ]},
  { id: 'career_09', categoria: 'career', pergunta: 'Como você vê empreender por conta própria?', opcoes: [
    { id: 'ja_estou', label: 'Já estou nessa' },
    { id: 'quero_muito', label: 'Quero muito — falta só momento' },
    { id: 'um_dia', label: 'Talvez um dia, sem pressa' },
    { id: 'nao_e_pra_mim', label: 'Não é pra mim' },
  ]},
  { id: 'career_10', categoria: 'career', pergunta: 'Sua reserva de transição (pra mudar de carreira ou parar um tempo) está...', opcoes: [
    { id: 'pronta', label: 'Pronta' },
    { id: 'metade', label: 'Mais ou menos na metade' },
    { id: 'comecando', label: 'Mal comecei' },
    { id: 'nao_existe', label: 'Não existe ainda' },
  ]},
  { id: 'career_11', categoria: 'career', pergunta: 'Quanto da sua identidade está ligada ao que você faz?', opcoes: [
    { id: 'muito', label: 'Muito — sou o que faço' },
    { id: 'parte', label: 'Uma parte importante' },
    { id: 'separado', label: 'Trabalho é trabalho, eu sou outra coisa' },
    { id: 'pouco', label: 'Pouco — meu trabalho não me define' },
  ]},
  { id: 'career_12', categoria: 'career', pergunta: 'O que mais te puxaria pra uma nova oportunidade?', opcoes: [
    { id: 'remuneracao', label: 'Remuneração' },
    { id: 'proposito', label: 'Propósito' },
    { id: 'flexibilidade', label: 'Flexibilidade / tempo' },
    { id: 'aprender', label: 'Aprender algo novo' },
    { id: 'pessoas', label: 'Pessoas com quem eu trabalharia' },
  ]},

  // ─── risk (10) ───────────────────────────────────────────────────
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
  { id: 'risk_04', categoria: 'risk', pergunta: 'Reserva de emergência pra você é...', opcoes: [
    { id: 'sagrada', label: 'Sagrada — nunca encosto' },
    { id: 'pronta_intacta', label: 'Está pronta, não mexo' },
    { id: 'construindo', label: 'Construindo aos poucos' },
    { id: 'nao_existe', label: 'Não tenho ainda' },
  ]},
  { id: 'risk_05', categoria: 'risk', pergunta: 'Antes de uma decisão financeira grande, você costuma...', opcoes: [
    { id: 'analisar', label: 'Pesquisar e analisar muito' },
    { id: 'pedir_2a', label: 'Pedir 2ª opinião (cônjuge, amigo, consultor)' },
    { id: 'sentir', label: 'Confiar no instinto' },
    { id: 'rapido', label: 'Decidir rápido pra não perder oportunidade' },
  ]},
  { id: 'risk_06', categoria: 'risk', pergunta: 'Como você se sente em relação a investimentos de renda variável (ações, fundos imobiliários, cripto)?', opcoes: [
    { id: 'tenho_parte', label: 'Tenho parte do meu portfólio neles' },
    { id: 'quero_entrar', label: 'Quero entrar, ainda não entrei' },
    { id: 'medo', label: 'Tenho medo — prefiro fixo' },
    { id: 'ja_perdi', label: 'Já me queimei — fugi' },
  ]},
  { id: 'risk_07', categoria: 'risk', pergunta: 'Diante de uma oportunidade incerta com potencial alto, você...', opcoes: [
    { id: 'topo_pequeno', label: 'Topo com uma fatia pequena, controlada' },
    { id: 'topo_grande', label: 'Vou com tudo se eu acreditar' },
    { id: 'estudo_demais', label: 'Estudo tanto que muitas vezes deixo passar' },
    { id: 'evito', label: 'Evito — prefiro o certo' },
  ]},
  { id: 'risk_08', categoria: 'risk', pergunta: 'Pensando em previdência privada ou plano de aposentadoria, você...', opcoes: [
    { id: 'tenho', label: 'Já tenho um' },
    { id: 'quero_montar', label: 'Quero montar' },
    { id: 'duvido', label: 'Tenho dúvida se vale a pena' },
    { id: 'nao_priorizo', label: 'Não é prioridade hoje' },
  ]},
  { id: 'risk_09', categoria: 'risk', pergunta: 'Em momento de mercado caindo forte, você costuma sentir...', opcoes: [
    { id: 'oportunidade', label: 'Empolgação — oportunidade' },
    { id: 'curiosidade', label: 'Curiosidade — quero entender o que acontece' },
    { id: 'desconforto', label: 'Desconforto, mas não ajo no impulso' },
    { id: 'panico', label: 'Pânico — quero proteger logo' },
  ]},
  { id: 'risk_10', categoria: 'risk', pergunta: 'Quanto da sua renda você acha saudável colocar em risco a cada mês?', opcoes: [
    { id: 'nada', label: 'Nada — só conservador' },
    { id: 'ate_10', label: 'Até 10%' },
    { id: 'ate_30', label: 'Até 30%' },
    { id: 'mais_30', label: 'Mais de 30%' },
    { id: 'nao_sei', label: 'Não sei avaliar' },
  ]},

  // ─── values (12) ─────────────────────────────────────────────────
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
  { id: 'values_03', categoria: 'values', pergunta: 'O que "ser rico" significa pra você?', opcoes: [
    { id: 'tempo', label: 'Ter tempo livre' },
    { id: 'patrimonio', label: 'Ter patrimônio acumulado' },
    { id: 'liberdade', label: 'Poder dizer não pro que não quero' },
    { id: 'cuidar', label: 'Poder cuidar de quem eu amo' },
    { id: 'experiencias', label: 'Viver experiências marcantes' },
  ]},
  { id: 'values_04', categoria: 'values', pergunta: 'Você prefere conforto ou crescimento?', opcoes: [
    { id: 'conforto', label: 'Conforto — vida em paz' },
    { id: 'crescimento', label: 'Crescimento — mesmo desconfortável' },
    { id: 'alterna', label: 'Alterno conforme a fase' },
    { id: 'dois', label: 'Não vejo conflito — quero os dois' },
  ]},
  { id: 'values_05', categoria: 'values', pergunta: 'Generosidade / doação faz parte do seu orçamento?', opcoes: [
    { id: 'mensal', label: 'Sim, todo mês' },
    { id: 'pontual', label: 'Pontualmente, quando me sensibiliza' },
    { id: 'quero_comecar', label: 'Quero começar' },
    { id: 'nao', label: 'Não faz parte hoje' },
  ]},
  { id: 'values_06', categoria: 'values', pergunta: 'Você se importa com o impacto ambiental / social das suas compras?', opcoes: [
    { id: 'muito', label: 'Muito — pesa na decisão' },
    { id: 'as_vezes', label: 'Às vezes pesa' },
    { id: 'pouco', label: 'Pouco — preço fala mais alto' },
    { id: 'nao_olho', label: 'Não costumo olhar' },
  ]},
  { id: 'values_07', categoria: 'values', pergunta: 'Qual dessas vidas é a mais próxima do que você quer?', opcoes: [
    { id: 'simples_paga', label: 'Simples e tranquila, sem dívidas' },
    { id: 'abundante_rotina', label: 'Confortável com boa rotina' },
    { id: 'movimento', label: 'Cheia de movimento e novas experiências' },
    { id: 'impacto_publico', label: 'Visível, com impacto público' },
  ]},
  { id: 'values_08', categoria: 'values', pergunta: 'O que te dá mais satisfação em gastar?', opcoes: [
    { id: 'experiencia', label: 'Experiência ao vivo' },
    { id: 'presentear', label: 'Presentear alguém' },
    { id: 'qualidade', label: 'Coisa de qualidade que dura' },
    { id: 'aprendizado', label: 'Aprendizado / curso' },
    { id: 'praticidade', label: 'Praticidade — comprar tempo' },
  ]},
  { id: 'values_09', categoria: 'values', pergunta: 'Como você lida com presentes / datas comemorativas?', opcoes: [
    { id: 'planejo', label: 'Planejo e separo grana antes' },
    { id: 'meio_susto', label: 'Costumo me organizar meio em cima da hora' },
    { id: 'caprichoso', label: 'Capricho — gasto bem nessas datas' },
    { id: 'simples', label: 'Simples — o gesto importa mais' },
  ]},
  { id: 'values_10', categoria: 'values', pergunta: 'O que você daria como primeiro conselho financeiro a alguém querido?', opcoes: [
    { id: 'reserva', label: 'Monta uma reserva, é prioridade' },
    { id: 'evita_dividas', label: 'Foge de dívidas caras' },
    { id: 'invista_em_voce', label: 'Investe em você primeiro' },
    { id: 'gaste_pouco', label: 'Gasta menos do que ganha' },
    { id: 'aproveite', label: 'Aproveita — vida é hoje' },
  ]},
  { id: 'values_11', categoria: 'values', pergunta: 'Em uma briga entre poupar e viver agora, qual lado costuma vencer?', opcoes: [
    { id: 'poupar', label: 'Poupar — quase sempre' },
    { id: 'viver', label: 'Viver agora — quase sempre' },
    { id: 'equilibrio', label: 'Vou no equilíbrio' },
    { id: 'fase', label: 'Depende da fase da vida' },
  ]},
  { id: 'values_12', categoria: 'values', pergunta: 'Como você gostaria de ser lembrado pelas pessoas mais próximas?', opcoes: [
    { id: 'presente', label: 'Como alguém presente' },
    { id: 'provedor', label: 'Como bom provedor' },
    { id: 'inspirador', label: 'Como inspiração' },
    { id: 'leve', label: 'Como pessoa leve, divertida' },
    { id: 'sabio', label: 'Como sábio, conselheiro' },
  ]},

  // ─── health (10) ─────────────────────────────────────────────────
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
  { id: 'health_03', categoria: 'health', pergunta: 'Como você descreveria seu sono no último mês?', opcoes: [
    { id: 'otimo', label: 'Ótimo — durmo bem' },
    { id: 'bom_oscilando', label: 'Bom, mas oscila' },
    { id: 'ruim_estresse', label: 'Ruim — estresse atrapalha' },
    { id: 'ruim_dinheiro', label: 'Ruim — penso em dinheiro à noite' },
  ]},
  { id: 'health_04', categoria: 'health', pergunta: 'Atividade física hoje na sua rotina é...', opcoes: [
    { id: 'fixa', label: 'Fixa, várias vezes por semana' },
    { id: 'eventual', label: 'Eventual' },
    { id: 'quero_retomar', label: 'Quero retomar' },
    { id: 'nao_faco', label: 'Não pratico' },
  ]},
  { id: 'health_05', categoria: 'health', pergunta: 'Como você cuida da sua saúde mental?', opcoes: [
    { id: 'terapia_fixa', label: 'Terapia regular' },
    { id: 'meditacao', label: 'Meditação / práticas próprias' },
    { id: 'rede_apoio', label: 'Rede de apoio (amigos, família)' },
    { id: 'pouco_atualmente', label: 'Pouco atualmente' },
    { id: 'nao_cuido', label: 'Não cuido' },
  ]},
  { id: 'health_06', categoria: 'health', pergunta: 'Sua alimentação hoje é...', opcoes: [
    { id: 'casa_planejado', label: 'Principalmente em casa, planejada' },
    { id: 'mista', label: 'Mista — casa e fora' },
    { id: 'muito_fora', label: 'Muito delivery / fora' },
    { id: 'sem_padrao', label: 'Sem padrão' },
  ]},
  { id: 'health_07', categoria: 'health', pergunta: 'Você nota relação entre seu humor e como gasta dinheiro?', opcoes: [
    { id: 'gasto_pra_aliviar', label: 'Sim — gasto mais quando estou pra baixo' },
    { id: 'gasto_pra_celebrar', label: 'Sim — gasto mais quando estou animado' },
    { id: 'pouco', label: 'Pouco, mas existe' },
    { id: 'nao_vejo', label: 'Não vejo essa relação' },
  ]},
  { id: 'health_08', categoria: 'health', pergunta: 'Como ficou seu peso / corpo no último ano?', opcoes: [
    { id: 'estavel', label: 'Estável, como eu gosto' },
    { id: 'subiu', label: 'Subiu mais do que eu queria' },
    { id: 'caiu', label: 'Caiu — bom ou ruim?' },
    { id: 'oscilando', label: 'Oscilando muito' },
  ]},
  { id: 'health_09', categoria: 'health', pergunta: 'Você guarda algum gasto fixo pro seu bem-estar (massagem, retiro, hobby)?', opcoes: [
    { id: 'sim', label: 'Sim, é inegociável' },
    { id: 'as_vezes', label: 'Às vezes, sem fixar' },
    { id: 'gostaria', label: 'Gostaria de fixar' },
    { id: 'nao_faz_sentido', label: 'Não faz sentido pra mim' },
  ]},
  { id: 'health_10', categoria: 'health', pergunta: 'O que mais te ajudaria a cuidar melhor da saúde hoje?', opcoes: [
    { id: 'tempo', label: 'Mais tempo' },
    { id: 'grana', label: 'Mais grana sobrando' },
    { id: 'disciplina', label: 'Mais disciplina' },
    { id: 'companhia', label: 'Alguém pra fazer junto' },
    { id: 'clareza', label: 'Mais clareza do que fazer' },
  ]},

  // ─── onbo (10) ───────────────────────────────────────────────────
  // Onboarding inicial — perguntas curtas pra capturar contexto base
  // logo no setup. Compartilham banco com Contexto Pessoal mas o
  // wizard preenche várias delas automaticamente.
  { id: 'onbo_01', categoria: 'onbo', pergunta: 'Qual a primeira coisa que te trouxe ao Haile?', opcoes: [
    { id: 'organizar', label: 'Organizar gastos, sair do caos' },
    { id: 'metas', label: 'Cumprir metas / sonhos específicos' },
    { id: 'familia', label: 'Coordenar com família / parceiro(a)' },
    { id: 'investir', label: 'Começar a investir melhor' },
    { id: 'curiosidade', label: 'Curiosidade — explorar o que oferece' },
  ]},
  { id: 'onbo_02', categoria: 'onbo', pergunta: 'Qual sua sensação geral hoje sobre suas finanças?', opcoes: [
    { id: 'no_controle', label: 'No controle' },
    { id: 'meio_perdido', label: 'Meio perdido(a)' },
    { id: 'preocupado', label: 'Preocupado(a)' },
    { id: 'curioso', label: 'Curioso(a) — querendo entender mais' },
  ]},
  { id: 'onbo_03', categoria: 'onbo', pergunta: 'Você já usou outro app de finanças antes?', opcoes: [
    { id: 'varios', label: 'Vários — sou veterano' },
    { id: 'um_dois', label: 'Um ou dois' },
    { id: 'tentei_desisti', label: 'Tentei e abandonei' },
    { id: 'primeira_vez', label: 'É a primeira vez' },
  ]},
  { id: 'onbo_04', categoria: 'onbo', pergunta: 'Como você gostaria que o Haile falasse com você?', opcoes: [
    { id: 'amigo', label: 'Como um amigo próximo' },
    { id: 'mentor', label: 'Como um mentor mais sério' },
    { id: 'coach', label: 'Como um coach motivador' },
    { id: 'analista', label: 'Como um analista direto e objetivo' },
  ]},
  { id: 'onbo_05', categoria: 'onbo', pergunta: 'Com que frequência você gostaria de receber recados do Haile?', opcoes: [
    { id: 'diaria', label: 'Diariamente' },
    { id: 'semanal', label: 'Algumas vezes na semana' },
    { id: 'so_importante', label: 'Só quando for importante' },
    { id: 'eu_busco', label: 'Eu venho quando precisar' },
  ]},
  { id: 'onbo_06', categoria: 'onbo', pergunta: 'O que você espera do Haile no primeiro mês de uso?', opcoes: [
    { id: 'mapa', label: 'Ter um mapa claro das minhas finanças' },
    { id: 'plano', label: 'Sair com um plano de ação' },
    { id: 'habito', label: 'Criar o hábito de acompanhar' },
    { id: 'tranquilidade', label: 'Sentir mais tranquilidade' },
  ]},
  { id: 'onbo_07', categoria: 'onbo', pergunta: 'Você prefere começar registrando...', opcoes: [
    { id: 'receitas', label: 'Receitas — entender o que entra' },
    { id: 'despesas', label: 'Despesas — entender pra onde vai' },
    { id: 'compromissos', label: 'Compromissos fixos (assinaturas, aluguel)' },
    { id: 'metas', label: 'Metas e sonhos' },
  ]},
  { id: 'onbo_08', categoria: 'onbo', pergunta: 'Quem mais vai aparecer aqui dentro com você?', opcoes: [
    { id: 'so_eu', label: 'Só eu' },
    { id: 'parceiro', label: 'Eu e meu parceiro(a)' },
    { id: 'familia', label: 'Família toda' },
    { id: 'amigos', label: 'Compartilho parte com amigos / sócios' },
  ]},
  { id: 'onbo_09', categoria: 'onbo', pergunta: 'Como você gostaria de visualizar seus dados?', opcoes: [
    { id: 'simples', label: 'Simples — só o essencial' },
    { id: 'graficos', label: 'Com gráficos e tendências' },
    { id: 'detalhado', label: 'Detalhado — quero todos os números' },
    { id: 'narrado', label: 'Narrado pelo Haile, em linguagem natural' },
  ]},
  { id: 'onbo_10', categoria: 'onbo', pergunta: 'Pra fechar: o que te faria sentir que o Haile valeu a pena?', opcoes: [
    { id: 'economia', label: 'Economizar mais do que paguei' },
    { id: 'paz', label: 'Sentir paz com dinheiro' },
    { id: 'meta_alcancada', label: 'Bater uma meta importante' },
    { id: 'clareza', label: 'Ter clareza do que faço com meu dinheiro' },
    { id: 'familia_alinhada', label: 'Família alinhada financeiramente' },
  ], permiteExtra: true },
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
