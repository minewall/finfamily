import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import Login from '@/pages/Login'
import VisaoGeral from '@/pages/VisaoGeral'
import Lancamentos from '@/pages/Lancamentos'
import Placeholder from '@/pages/Placeholder'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<VisaoGeral />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/contas" element={<Placeholder title="Contas" />} />
              <Route path="/metas" element={<Placeholder title="Metas" />} />
              <Route path="/simulador" element={<Placeholder title="Simulador" hint="Vai nascer como Simulador Guiado." />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
