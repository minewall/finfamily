import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import Login from '@/pages/Login'
import VisaoGeral from '@/pages/VisaoGeral'
import Comparativo from '@/pages/Comparativo'
import Lancamentos from '@/pages/Lancamentos'
import Receitas from '@/pages/Receitas'
import Despesas from '@/pages/Despesas'
import Contas from '@/pages/Contas'
import Cartoes from '@/pages/Cartoes'
import Metas from '@/pages/Metas'
import Simulador from '@/pages/Simulador'
import Familia from '@/pages/Familia'
import Reembolsos from '@/pages/Reembolsos'
import Compromissos from '@/pages/Compromissos'
import Patrimonio from '@/pages/Patrimonio'
import Financiamentos from '@/pages/Financiamentos'
import Configuracoes from '@/pages/Configuracoes'
import MeuPainel from '@/pages/MeuPainel'
import AceitarConvite from '@/pages/AceitarConvite'
import Tributario from '@/pages/Tributario'
import Recados from '@/pages/Recados'
import Onboarding from '@/pages/Onboarding'
import ContextoPessoal from '@/pages/ContextoPessoal'
import Assinatura from '@/pages/Assinatura'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* basename casa com o Vite `base` (web/vite.config.ts) — sem isso o
            React Router fica perdido em prod servindo de /app/. import.meta.env.BASE_URL
            já vem com trailing slash; precisamos sem pra basename. */}
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Aceitação de convite: rota lida com "sem sessão" internamente. */}
            <Route path="/aceitar/:token" element={<AceitarConvite />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<VisaoGeral />} />
              <Route path="/comparativo" element={<Comparativo />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/contas" element={<Contas />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/metas" element={<Metas />} />
              <Route path="/simulador" element={<Simulador />} />
              <Route path="/familia" element={<Familia />} />
              <Route path="/compromissos" element={<Compromissos />} />
              <Route path="/reembolsos" element={<Reembolsos />} />
              <Route path="/patrimonio" element={<Patrimonio />} />
              <Route path="/financiamentos" element={<Financiamentos />} />
              <Route path="/meupainel" element={<MeuPainel />} />
              <Route path="/tributario" element={<Tributario />} />
              <Route path="/recados" element={<Recados />} />
              <Route path="/assinatura" element={<Assinatura />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/contexto" element={<ContextoPessoal />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
