import { useEffect } from 'react'
import { useData } from '@/store/useData'

/**
 * ThemeApplier — componente invisível que sincroniza
 * `data.settings.theme` com `document.documentElement.dataset.theme`.
 *
 * Valores: 'light' | 'dark' | 'auto'. Default = 'dark' (DUO nasceu dark).
 * Em 'auto', escuta matchMedia('(prefers-color-scheme: light)').
 *
 * Sprint 5 (Configurações). O modo claro ainda está em refinamento — só
 * inverte cores via [data-theme='light'] em index.css.
 */
export function ThemeApplier() {
  const data = useData((s) => s.data)
  const themePref = (((data?.settings as Record<string, unknown> | undefined)?.theme as string | undefined) ?? 'dark') as
    | 'light'
    | 'dark'
    | 'auto'

  useEffect(() => {
    const root = document.documentElement
    if (themePref === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: light)')
      const apply = () => {
        root.dataset.theme = mq.matches ? 'light' : 'dark'
      }
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
    root.dataset.theme = themePref
  }, [themePref])

  return null
}
