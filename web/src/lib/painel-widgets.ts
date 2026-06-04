// Definição dos widgets do Meu Painel (Track Q).
//
// MVP: 4 widgets, todos ativos por default. Persistência em `data.meuPainel.widgets`
// como array de IDs (ordem importa). Reordenar / drag-and-drop fica parked.
import { AlertCircle, Calendar, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import type { UserData } from '@haile/shared'

export type WidgetId = 'resumo' | 'metas' | 'alertas' | 'vencimentos'

export interface WidgetDef {
  id: WidgetId
  label: string
  desc: string
  icon: LucideIcon
  default: boolean
}

export const WIDGET_DEFS: Record<WidgetId, WidgetDef> = {
  resumo: {
    id: 'resumo',
    label: 'Resumo Financeiro',
    desc: 'Receitas, despesas e Poder de Escolha do mês corrente.',
    icon: TrendingUp,
    default: true,
  },
  metas: {
    id: 'metas',
    label: 'Metas em Destaque',
    desc: 'Top 3 metas com maior progresso.',
    icon: Target,
    default: true,
  },
  alertas: {
    id: 'alertas',
    label: 'Alertas',
    desc: 'Recados urgentes ou avisos ainda não lidos.',
    icon: AlertCircle,
    default: true,
  },
  vencimentos: {
    id: 'vencimentos',
    label: 'Próximos Vencimentos',
    desc: 'Compromissos com vencimento nos próximos 7 dias.',
    icon: Calendar,
    default: true,
  },
}

export const WIDGET_ORDER_DEFAULT: WidgetId[] = ['resumo', 'metas', 'alertas', 'vencimentos']

/** Retorna a lista de widgets ativos. Se nunca foi customizado, retorna os defaults. */
export function getActiveWidgets(data: UserData | null | undefined): WidgetId[] {
  const mp = (data?.meuPainel ?? {}) as { widgets?: string[] }
  const list = mp.widgets
  if (!Array.isArray(list)) {
    return WIDGET_ORDER_DEFAULT.slice()
  }
  // Filtra apenas IDs conhecidos pra evitar resíduo de versões antigas.
  return list.filter((id): id is WidgetId => id in WIDGET_DEFS)
}

/** Constrói o objeto `meuPainel` pronto pra ir no blob. */
export function setActiveWidgets(
  _data: UserData,
  widgets: string[],
): NonNullable<UserData['meuPainel']> {
  const valid = widgets.filter((id): id is WidgetId => id in WIDGET_DEFS)
  return { widgets: valid }
}
