// Onboarding — porte do fluxo do Dino (onboarding.html + Store.completeOnboarding).
// Wizard com 7 perguntas estruturadas (Opção B): nome, objetivo, família, renda
// + 3 starters do banco do ICP (money_emocao, risk_perfil, values_top). Alimenta
// categorias basic + dreams + family + career + money + risk + values.

export type OnboardingObjetivo = 'dividas' | 'reserva' | 'investir' | 'sonho'
export type OnboardingFamilia = 'solo' | 'casal' | 'filhos'
export type OnboardingRenda = 'ate3k' | '3_8k' | '8_20k' | 'acima20k' | 'prefiro_nao'

// Starters do ICP — IDs e opções ficam idênticos aos do banco em contexto.ts pra
// dedup automática quando o usuário reabrir essas perguntas na tela do ICP.
export type OnboardingSentimento = 'tranquilo' | 'preocupado' | 'ansioso' | 'sem_pensar'
export type OnboardingRisco = 'conservador' | 'moderado' | 'arrojado' | 'depende'
export type OnboardingValor = 'experiencias' | 'familia' | 'futuro' | 'sucesso'

export interface OnboardingAnswers {
  nome?: string
  objetivo?: OnboardingObjetivo
  familia?: OnboardingFamilia
  renda?: OnboardingRenda
  sentimento?: OnboardingSentimento
  risco?: OnboardingRisco
  valor?: OnboardingValor
  [k: string]: unknown
}

export interface OnboardingState {
  completed: boolean
  completedAt?: string | null
  startedAt?: string | null
  pausedAtStep?: number
  goalId?: string | null
  answers?: OnboardingAnswers
  [k: string]: unknown
}

export const OBJETIVO_LABELS: Record<OnboardingObjetivo, string> = {
  dividas:  'Sair do vermelho / quitar dívidas',
  reserva:  'Construir reserva de emergência',
  investir: 'Investir e fazer dinheiro trabalhar',
  sonho:    'Realizar um sonho específico',
}

export const FAMILIA_LABELS: Record<OnboardingFamilia, string> = {
  solo:   'Decido sozinho(a) minhas finanças',
  casal:  'Decisões compartilhadas com cônjuge',
  filhos: 'Família — cônjuge, filhos, etc.',
}

export const RENDA_LABELS: Record<OnboardingRenda, string> = {
  ate3k:       'Até R$ 3.000',
  '3_8k':      'R$ 3.000 a R$ 8.000',
  '8_20k':     'R$ 8.000 a R$ 20.000',
  acima20k:    'Acima de R$ 20.000',
  prefiro_nao: 'Prefiro não dizer',
}

export const SENTIMENTO_LABELS: Record<OnboardingSentimento, string> = {
  tranquilo:  'Tranquilo(a), está sob controle',
  preocupado: 'Preocupado(a) — sinto que poderia ir melhor',
  ansioso:    'Ansioso(a) — falta clareza ou sobra',
  sem_pensar: 'Não penso muito sobre isso',
}

export const RISCO_LABELS: Record<OnboardingRisco, string> = {
  conservador: 'Conservador(a) — segurança em primeiro',
  moderado:    'Moderado(a) — aceito risco em parte',
  arrojado:    'Arrojado(a) — busco retorno alto',
  depende:     'Depende — varia conforme o momento',
}

export const VALOR_LABELS: Record<OnboardingValor, string> = {
  experiencias: 'Experiências (viagens, vivências)',
  familia:      'Família (educação, qualidade de vida deles)',
  futuro:       'Futuro (aposentadoria, segurança)',
  sucesso:      'Crescimento pessoal / negócio',
}

export interface OnboardingStepSpec {
  id: 'welcome' | 'nome' | 'objetivo' | 'familia' | 'renda' | 'sentimento' | 'risco' | 'valor' | 'done'
  title: string
  subtitle?: string
}

export const ONBOARDING_STEPS: OnboardingStepSpec[] = [
  { id: 'welcome',    title: 'Bem-vindo(a) ao Haile',     subtitle: 'Em 7 perguntas rápidas, o Haile já começa a te conhecer de verdade.' },
  { id: 'nome',       title: 'Como você quer ser chamado(a)?' },
  { id: 'objetivo',   title: 'Qual é sua prioridade financeira agora?' },
  { id: 'familia',    title: 'Quem faz parte da sua vida financeira?' },
  { id: 'renda',      title: 'Qual é a renda mensal da sua família, aproximadamente?', subtitle: 'Pular se preferir.' },
  { id: 'sentimento', title: 'Como você se sente em relação ao seu dinheiro hoje?' },
  { id: 'risco',      title: 'E quando o assunto é risco, você se considera...' },
  { id: 'valor',      title: 'Se tivesse que escolher UMA coisa pra investir seu dinheiro, seria...' },
  { id: 'done',       title: 'Pronto! Bora começar' },
]

/** Mapeia as respostas do onboarding pras categorias do ICP.
 *  Cada item gera uma ContextoResposta pra alimentar o sistema. */
export interface OnboardingICPMap {
  categoria: string
  perguntaId: string
  pergunta: string
  resposta: string
}

export function mapeiaRespostasParaICP(answers: OnboardingAnswers | undefined | null): OnboardingICPMap[] {
  const a = answers ?? {}
  const out: OnboardingICPMap[] = []
  if (a.nome) {
    out.push({ categoria: 'basic', perguntaId: 'onb_nome', pergunta: 'Como gosta de ser chamado(a)', resposta: a.nome })
  }
  if (a.objetivo) {
    out.push({ categoria: 'dreams', perguntaId: 'onb_objetivo', pergunta: 'Prioridade financeira agora', resposta: OBJETIVO_LABELS[a.objetivo] })
  }
  if (a.familia) {
    out.push({ categoria: 'family', perguntaId: 'onb_familia', pergunta: 'Como é sua família', resposta: FAMILIA_LABELS[a.familia] })
  }
  if (a.renda && a.renda !== 'prefiro_nao') {
    out.push({ categoria: 'career', perguntaId: 'onb_renda', pergunta: 'Faixa de renda mensal familiar', resposta: RENDA_LABELS[a.renda] })
  }
  // Starters do banco do ICP — usam o id real pra dedupar com a tela de Contexto Pessoal.
  if (a.sentimento) {
    out.push({ categoria: 'money', perguntaId: 'money_emocao', pergunta: 'Como você se sente em relação ao seu dinheiro hoje?', resposta: SENTIMENTO_LABELS[a.sentimento] })
  }
  if (a.risco) {
    out.push({ categoria: 'risk', perguntaId: 'risk_perfil', pergunta: 'Você se considera...', resposta: RISCO_LABELS[a.risco] })
  }
  if (a.valor) {
    out.push({ categoria: 'values', perguntaId: 'values_top', pergunta: 'Se você tivesse que escolher UMA coisa pra investir o seu dinheiro, seria...', resposta: VALOR_LABELS[a.valor] })
  }
  return out
}
