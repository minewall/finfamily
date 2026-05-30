// Catálogo canônico de categorias do Haile (portado do Dino store.js CATEGORIES).
// Lucide icon names. Cores em hex (HEX puro p/ funcionar em style inline).
export interface CategoryDef {
  label: string
  color: string
  icon: string
}

export const CATEGORIES: Record<string, CategoryDef> = {
  moradia: { label: 'Moradia', color: '#7C6EF8', icon: 'home' },
  alimentacao: { label: 'Alimentação', color: '#22C55E', icon: 'shopping-cart' },
  transporte: { label: 'Transporte', color: '#3B82F6', icon: 'car' },
  saude: { label: 'Saúde', color: '#EC4899', icon: 'heart' },
  educacao: { label: 'Educação', color: '#06B6D4', icon: 'book-open' },
  pets: { label: 'Pets', color: '#F97316', icon: 'dog' },
  servicos_profissionais: { label: 'Serviços Profissionais', color: '#F59E0B', icon: 'scale' },
  financeiro: { label: 'Impostos, Taxas e Seguros', color: '#6366F1', icon: 'landmark' },
  assinaturas: { label: 'Assinaturas', color: '#8B5CF6', icon: 'play-circle' },
  lazer: { label: 'Lazer', color: '#14B8A6', icon: 'party-popper' },
  pessoal: { label: 'Pessoal', color: '#F59E0B', icon: 'user-round' },
  apoio_financeiro: { label: 'Apoio Financeiro', color: '#A78BFA', icon: 'hand-coins' },
  receita: { label: 'Receita', color: '#22C55E', icon: 'banknote' },
}

export function getCategoryLabel(key?: string | null): string {
  if (!key) return '—'
  return CATEGORIES[key]?.label ?? key
}

export function getCategoryColor(key?: string | null): string {
  if (!key) return '#454b6d' // slate
  return CATEGORIES[key]?.color ?? '#454b6d'
}

export function getCategoryIcon(key?: string | null): string {
  if (!key) return 'circle'
  return CATEGORIES[key]?.icon ?? 'circle'
}
