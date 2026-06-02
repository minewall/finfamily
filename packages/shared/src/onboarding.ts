// Onboarding — porte do fluxo do Dino (onboarding.html + Store.completeOnboarding).
// Wizard com 6 steps coletando: nome, objetivo, família, renda. Ao final,
// respostas alimentam o ICP (categorias dreams + family + money).

export type OnboardingObjetivo = 'dividas' | 'reserva' | 'investir' | 'sonho'
export type OnboardingFamilia = 'solo' | 'casal' | 'filhos'
export type OnboardingRenda = 'ate3k' | '3_8k' | '8_20k' | 'acima20k' | 'prefiro_nao'

export interface OnboardingAnswers {
  nome?: string
  objetivo?: OnboardingObjetivo
  familia?: OnboardingFamilia
  renda?: OnboardingRenda
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

export interface OnboardingStepSpec {
  id: 'welcome' | 'nome' | 'objetivo' | 'familia' | 'renda' | 'done'
  title: string
  subtitle?: string
}

export const ONBOARDING_STEPS: OnboardingStepSpec[] = [
  { id: 'welcome',  title: 'Bem-vindo(a) ao Haile',     subtitle: 'Em 4 perguntas, o Haile já começa a te conhecer.' },
  { id: 'nome',     title: 'Como você quer ser chamado(a)?' },
  { id: 'objetivo', title: 'Qual é sua prioridade financeira agora?' },
  { id: 'familia',  title: 'Quem faz parte da sua vida financeira?' },
  { id: 'renda',    title: 'Qual é a renda mensal da sua família, aproximadamente?', subtitle: 'Pular se preferir.' },
  { id: 'done',     title: 'Pronto! Bora começar' },
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
  return out
}
