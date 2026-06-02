import { useMemo } from 'react'
import { countNaoLidos } from '@haile/shared'
import { useData } from '@/store/useData'

interface Props {
  /** Quando true, esconde o badge se contador for 0. Default true. */
  hideIfZero?: boolean
  className?: string
}

/**
 * Badge com contador de recados não lidos. Pequeno chip vermelho que aparece
 * ao lado do item nav "Recados" (ou em qualquer lugar onde for inserido).
 */
export function RecadosBadge({ hideIfZero = true, className }: Props) {
  const data = useData((s) => s.data)
  const n = useMemo(() => (data ? countNaoLidos(data) : 0), [data])
  if (hideIfZero && n === 0) return null
  return (
    <span
      className={
        'inline-flex min-w-[18px] items-center justify-center rounded-full bg-red px-1.5 text-[10px] font-bold leading-none text-white ' +
        (className ?? '')
      }
      style={{ height: 18 }}
      aria-label={`${n} recados não lidos`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}
