import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutGrid,
  Receipt,
  Wallet,
  Target,
  LineChart,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { to: '/', label: 'Visão Geral', icon: <LayoutGrid size={18} /> },
  { to: '/lancamentos', label: 'Lançamentos', icon: <Receipt size={18} /> },
  { to: '/contas', label: 'Contas', icon: <Wallet size={18} /> },
  { to: '/metas', label: 'Metas', icon: <Target size={18} /> },
  { to: '/simulador', label: 'Simulador', icon: <LineChart size={18} /> },
]

export function AppShell() {
  const { session, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const email = session?.user?.email ?? ''
  const initial = (email[0] ?? '?').toUpperCase()

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-line bg-sidebar transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="font-serif text-xl tracking-tight text-ink">Haile</div>
          <button
            type="button"
            className="rounded-lg p-1 text-mist hover:bg-elevated md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-elevated text-ink'
                    : 'text-mist hover:bg-elevated hover:text-ink',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo text-xs font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1 truncate text-xs text-mist">{email}</div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg p-1.5 text-mist hover:bg-elevated hover:text-ink"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            className="rounded-lg p-1 text-mist hover:bg-elevated"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="font-serif text-lg text-ink">Haile</div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
