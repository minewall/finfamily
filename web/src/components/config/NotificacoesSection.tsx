import { Bell } from 'lucide-react'
import { useData } from '@/store/useData'
import { cn } from '@/lib/utils'

interface NotifPrefs {
  fechamentoMensal?: boolean
  vencimentos?: boolean
  coachProativo?: boolean
  [k: string]: boolean | undefined
}

const TOGGLES: Array<{ key: keyof NotifPrefs; label: string; desc: string }> = [
  {
    key: 'fechamentoMensal',
    label: 'Lembrete mensal de fechamento',
    desc: 'Te avisa no fim do mês pra revisar o que entrou e saiu antes de virar o mês.',
  },
  {
    key: 'vencimentos',
    label: 'Avisos de vencimentos próximos',
    desc: 'Alerta de contas, parcelas e compromissos que vencem nos próximos dias.',
  },
  {
    key: 'coachProativo',
    label: 'Sugestões do Coach proativas',
    desc: 'Mensagens do Haile quando ele identifica algo digno de atenção.',
  },
]

export function NotificacoesSection() {
  const getSetting = useData((s) => s.getSetting)
  const setSetting = useData((s) => s.setSetting)
  const data = useData((s) => s.data)
  void data
  const notif = getSetting<NotifPrefs>('notif', {}) ?? {}

  function isOn(k: keyof NotifPrefs): boolean {
    // default ON pra todos os toggles
    return notif[k] === undefined ? true : !!notif[k]
  }
  function toggle(k: keyof NotifPrefs) {
    const next: NotifPrefs = { ...notif, [k]: !isOn(k) }
    setSetting('notif', next)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Notificações</h2>
        <p className="mt-1 text-sm text-mist">
          Escolha quando e como o Haile fala com você.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-2">
        <ul className="divide-y divide-line">
          {TOGGLES.map((t) => {
            const on = isOn(t.key)
            return (
              <li key={t.key} className="flex items-start gap-3 px-4 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-mist">
                  <Bell size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.label}</p>
                  <p className="mt-0.5 text-xs text-mist">{t.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t.label}
                  onClick={() => toggle(t.key)}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                    on ? 'bg-indigo' : 'bg-line-2',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      on ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
