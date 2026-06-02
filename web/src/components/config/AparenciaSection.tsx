import { Moon, Sun, MonitorSmartphone, Info } from 'lucide-react'
import { useData } from '@/store/useData'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'auto'

const OPTIONS: Array<{ id: Theme; label: string; desc: string; icon: typeof Moon }> = [
  { id: 'dark', label: 'Escuro', desc: 'O modo padrão do Haile.', icon: Moon },
  { id: 'light', label: 'Claro', desc: 'Em refinamento.', icon: Sun },
  { id: 'auto', label: 'Automático', desc: 'Segue o sistema.', icon: MonitorSmartphone },
]

export function AparenciaSection() {
  const getSetting = useData((s) => s.getSetting)
  const setSetting = useData((s) => s.setSetting)
  const data = useData((s) => s.data)
  // depende de data pra re-renderizar quando o blob mudar
  void data
  const current = getSetting<Theme>('theme', 'dark')

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Aparência</h2>
        <p className="mt-1 text-sm text-mist">
          Escolha como o Haile aparece pra você.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <fieldset className="grid gap-3 md:grid-cols-3">
          <legend className="sr-only">Tema</legend>
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = current === opt.id
            return (
              <label
                key={opt.id}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors',
                  active
                    ? 'border-indigo bg-elevated'
                    : 'border-line-2 bg-bg hover:bg-elevated',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={opt.id}
                  checked={active}
                  onChange={() => setSetting('theme', opt.id)}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <Icon size={16} className={active ? 'text-indigo' : 'text-mist'} />
                  <span className="text-sm font-semibold text-ink">{opt.label}</span>
                </div>
                <p className="text-xs text-mist">{opt.desc}</p>
              </label>
            )
          })}
        </fieldset>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          O app está otimizado pra modo escuro. O modo claro ainda está em refinamento —
          pode ter cantos a polir.
        </p>
      </div>
    </div>
  )
}
