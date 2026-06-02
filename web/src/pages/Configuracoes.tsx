import { useState, type ReactNode } from 'react'
import {
  User,
  Lock,
  Palette,
  DatabaseBackup,
  Layers,
  Tags,
  Bell,
  Shield,
  Info,
  TrendingUp,
} from 'lucide-react'
import { PerfilSection } from '@/components/config/PerfilSection'
import { SenhaSection } from '@/components/config/SenhaSection'
import { AparenciaSection } from '@/components/config/AparenciaSection'
import { BackupSection } from '@/components/config/BackupSection'
import { TiposSection } from '@/components/config/TiposSection'
import { CategoriasSection } from '@/components/config/CategoriasSection'
import { NotificacoesSection } from '@/components/config/NotificacoesSection'
import { PrivacidadeSection } from '@/components/config/PrivacidadeSection'
import { SobreSection } from '@/components/config/SobreSection'
import { CotacoesSection } from '@/components/config/CotacoesSection'
import { cn } from '@/lib/utils'

type Tab =
  | 'perfil'
  | 'tipos'
  | 'categorias'
  | 'senha'
  | 'aparencia'
  | 'notificacoes'
  | 'backup'
  | 'cotacoes'
  | 'privacidade'
  | 'sobre'

interface TabDef {
  id: Tab
  label: string
  icon: ReactNode
  render: () => ReactNode
}

const TABS: TabDef[] = [
  { id: 'perfil', label: 'Perfil', icon: <User size={16} />, render: () => <PerfilSection /> },
  { id: 'tipos', label: 'Tipos', icon: <Layers size={16} />, render: () => <TiposSection /> },
  { id: 'categorias', label: 'Categorias', icon: <Tags size={16} />, render: () => <CategoriasSection /> },
  { id: 'senha', label: 'Senha', icon: <Lock size={16} />, render: () => <SenhaSection /> },
  { id: 'aparencia', label: 'Aparência', icon: <Palette size={16} />, render: () => <AparenciaSection /> },
  { id: 'notificacoes', label: 'Notificações', icon: <Bell size={16} />, render: () => <NotificacoesSection /> },
  { id: 'backup', label: 'Backup', icon: <DatabaseBackup size={16} />, render: () => <BackupSection /> },
  { id: 'cotacoes', label: 'Cotações', icon: <TrendingUp size={16} />, render: () => <CotacoesSection /> },
  { id: 'privacidade', label: 'Privacidade', icon: <Shield size={16} />, render: () => <PrivacidadeSection /> },
  { id: 'sobre', label: 'Sobre', icon: <Info size={16} />, render: () => <SobreSection /> },
]

export default function Configuracoes() {
  const [active, setActive] = useState<Tab>('perfil')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-mist">
          Conta, segurança, aparência, dados e privacidade.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Sub-nav lateral (vira tabs horizontais no mobile) */}
        <nav
          className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-2 md:flex-col md:overflow-visible md:self-start"
          aria-label="Seções de configurações"
        >
          {TABS.map((t) => {
            const isActive = t.id === active
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-elevated text-ink'
                    : 'text-mist hover:bg-elevated hover:text-ink',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </nav>

        <section className="min-w-0">{tab.render()}</section>
      </div>
    </div>
  )
}
