import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else nav('/', { replace: true })
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-serif text-3xl text-ink">Haile</h1>
        <p className="mb-7 text-sm text-mist">Inteligência financeira para famílias modernas.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-line-2 bg-surface px-4 text-sm text-ink outline-none focus:border-indigo"
          />
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border border-line-2 bg-surface px-4 text-sm text-ink outline-none focus:border-indigo"
          />
          {error && <p className="text-xs text-red">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-1">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-faint">DUO · nova versão (beta)</p>
      </div>
    </div>
  )
}
