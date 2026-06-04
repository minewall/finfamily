import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  BarChart3,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  LineChart,
  Users,
  User,
  HandCoins,
  FileText,
  FileSpreadsheet,
  Bell,
  Landmark,
  Banknote,
  Settings,
  Brain,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { cotacoesExpiradas } from '@haile/shared'
import { useAuth } from '@/lib/auth'
import { useCoach } from '@/store/useCoach'
import { useData } from '@/store/useData'
import { HailePanel } from '@/components/HailePanel'
import { HaileTakeover } from '@/components/HaileTakeover'
import { ThemeApplier } from '@/components/ThemeApplier'
import { RecadosBadge } from '@/components/RecadosBadge'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Renderiza badge à direita do label (atualmente só recados). */
  badge?: 'recados'
}

const NAV: NavItem[] = [
  { to: '/', label: 'Visão Geral', icon: <LayoutGrid size={18} /> },
  { to: '/comparativo', label: 'Comparativo', icon: <BarChart3 size={18} /> },
  { to: '/lancamentos', label: 'Lançamentos', icon: <Receipt size={18} /> },
  { to: '/receitas', label: 'Receitas', icon: <TrendingUp size={18} /> },
  { to: '/despesas', label: 'Despesas', icon: <TrendingDown size={18} /> },
  { to: '/compromissos', label: 'Compromissos', icon: <FileText size={18} /> },
  { to: '/financiamentos', label: 'Financiamentos', icon: <Banknote size={18} /> },
  { to: '/contas', label: 'Contas', icon: <Wallet size={18} /> },
  { to: '/cartoes', label: 'Cartões', icon: <CreditCard size={18} /> },
  { to: '/patrimonio', label: 'Patrimônio', icon: <Landmark size={18} /> },
  { to: '/tributario', label: 'Tributário', icon: <FileSpreadsheet size={18} /> },
  { to: '/metas', label: 'Metas', icon: <Target size={18} /> },
  { to: '/familia', label: 'Família', icon: <Users size={18} /> },
  { to: '/meupainel', label: 'Meu Painel', icon: <User size={18} /> },
  { to: '/reembolsos', label: 'Reembolsos', icon: <HandCoins size={18} /> },
  { to: '/simulador', label: 'Simulador', icon: <LineChart size={18} /> },
  { to: '/recados', label: 'Recados', icon: <Bell size={18} />, badge: 'recados' },
  { to: '/contexto', label: 'Contexto Pessoal', icon: <Brain size={18} /> },
  { to: '/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
]

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export function AppShell() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const openHaile = useCoach((s) => s.setOpen)
  const setTakeoverOpen = useCoach((s) => s.setTakeoverOpen)
  const data = useData((s) => s.data)
  const loading = useData((s) => s.loading)
  const getFlag = useData((s) => s.getFlag)
  const getOnboarding = useData((s) => s.getOnboarding)
  const load = useData((s) => s.load)
  const refreshCotacoes = useData((s) => s.refreshCotacoes)
  const email = session?.user?.email ?? ''
  const initial = (email[0] ?? '?').toUpperCase()

  // Garante que carregamos o blob assim que o shell monta (algumas telas
  // disparam load(), outras não; aqui é o lugar único de entrada).
  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  // Gate do onboarding: se não está completo e não é uma rota de exceção
  // (aceitar convite, próprio onboarding), redireciona pra /onboarding.
  useEffect(() => {
    if (!data) return
    if (loading) return
    const onb = getOnboarding()
    if (onb.completed) return
    // rotas que podem ser acessadas mesmo sem onboarding
    if (location.pathname === '/onboarding') return
    if (location.pathname.startsWith('/aceitar/')) return
    navigate('/onboarding', { replace: true })
  }, [data, loading, getOnboarding, location.pathname, navigate])

  // Gate do takeover de 1º acesso: só dispara DEPOIS que onboarding terminou
  // e com zero dados.
  useEffect(() => {
    if (!data) return
    if (loading) return
    if (!getOnboarding().completed) return
    if (getFlag('haileFirstRunDismissed', false)) return
    const zero = !(data.receitas?.length) && !(data.despesas?.length) && !(data.contas?.length)
    if (!zero) return
    const t = setTimeout(() => setTakeoverOpen(true), 500)
    return () => clearTimeout(t)
  }, [data, loading, getFlag, getOnboarding, setTakeoverOpen])

  // Auto-refresh de cotações se mais antigas que 6h. Não bloqueia UI;
  // falha silenciosa (rede offline ou CORS).
  useEffect(() => {
    if (!data) return
    if (loading) return
    if (!cotacoesExpiradas(data.cotacoes, SIX_HOURS_MS)) return
    void refreshCotacoes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?._syncedAt, loading])

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
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge === 'recados' && <RecadosBadge />}
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
          <button
            type="button"
            onClick={() => openHaile(true)}
            className="ml-auto rounded-lg bg-gradient-to-br from-indigo to-teal p-2 text-white"
            aria-label="Falar com o Haile"
          >
            <Sparkles size={16} />
          </button>
        </header>

        <Outlet />

        {/* Botão flutuante "Falar com o Haile" (desktop) */}
        <button
          type="button"
          onClick={() => openHaile(true)}
          className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-gradient-to-br from-indigo to-teal px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo/30 transition-transform hover:scale-105 md:inline-flex"
          aria-label="Falar com o Haile"
        >
          <Sparkles size={16} />
          Falar com o Haile
        </button>
      </main>

      {/* Painel do Haile (drawer à direita) */}
      <HailePanel />

      {/* Takeover de 1º acesso (overlay central) */}
      <HaileTakeover />

      {/* Aplica tema (claro/escuro/auto) em <html data-theme> */}
      <ThemeApplier />
    </div>
  )
}
