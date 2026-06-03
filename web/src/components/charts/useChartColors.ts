import { useEffect, useState } from 'react'
import { useData } from '@/store/useData'

export interface ChartColors {
  axis: string
  grid: string
  text: string
  tooltipBg: string
  tooltipBorder: string
  series: string[]
  positive: string
  negative: string
  neutral: string
}

const DARK: ChartColors = {
  axis: 'rgba(255,255,255,0.18)',
  grid: 'rgba(255,255,255,0.06)',
  text: '#7c82a4',
  tooltipBg: '#1b1e31',
  tooltipBorder: 'rgba(255,255,255,0.11)',
  series: ['#6b5ef5', '#2dcfc0', '#ffa930', '#4aa8ff', '#1dc97e', '#ff4a68'],
  positive: '#1dc97e',
  negative: '#ff4a68',
  neutral: '#7c82a4',
}

const LIGHT: ChartColors = {
  axis: 'rgba(15,18,38,0.20)',
  grid: 'rgba(15,18,38,0.06)',
  text: '#4A5174',
  tooltipBg: '#FFFFFF',
  tooltipBorder: 'rgba(15,18,38,0.14)',
  series: ['#5a4ee4', '#26b4a7', '#e89515', '#3a92e0', '#0fa667', '#e63a59'],
  positive: '#0fa667',
  negative: '#e63a59',
  neutral: '#4A5174',
}

function readDomTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/**
 * Hook que devolve a paleta correta de chart para o tema ativo.
 * Recharts não respeita CSS vars em props como `stroke` / `fill` — então
 * resolvemos o tema em JS. Reage tanto a mudança em `data.settings.theme`
 * (via store) quanto a alteração externa em `documentElement.dataset.theme`
 * (ThemeApplier roda em useEffect, então `auto` também é captado).
 */
export function useChartColors(): ChartColors {
  const settingsTheme = useData((s) => (s.data?.settings as Record<string, unknown> | undefined)?.theme as
    | 'light'
    | 'dark'
    | 'auto'
    | undefined)
  const [domTheme, setDomTheme] = useState<'light' | 'dark'>(() => readDomTheme())

  useEffect(() => {
    setDomTheme(readDomTheme())
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setDomTheme(readDomTheme())
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [settingsTheme])

  return domTheme === 'light' ? LIGHT : DARK
}
