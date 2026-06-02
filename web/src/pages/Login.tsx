import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type Mode = 'password' | 'magic'

export default function Login() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState<null | 'password' | 'magic' | 'google' | 'apple'>(null)
  const [magicSent, setMagicSent] = useState(false)
  const nav = useNavigate()

  async function submitPassword(e: FormEvent) {
    e.preventDefault()
    setLoading('password')
    setError(null)
    setInfo(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(null)
    if (error) {
      const msg = error.message.toLowerCase().includes('invalid')
        ? 'E-mail ou senha incorretos. Se você criou a conta com Google, use o botão abaixo.'
        : error.message
      setError(msg)
      return
    }
    nav('/', { replace: true })
  }

  async function submitMagic(e: FormEvent) {
    e.preventDefault()
    setLoading('magic')
    setError(null)
    setInfo(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/' },
    })
    setLoading(null)
    if (error) {
      setError('Não foi possível enviar o link. Tente novamente.')
      return
    }
    setMagicSent(true)
    setInfo('Enviamos um link de acesso para o seu e-mail. Clique para entrar.')
  }

  async function withProvider(provider: 'google' | 'apple') {
    setLoading(provider)
    setError(null)
    setInfo(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/',
        queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : undefined,
      },
    })
    if (error) {
      setLoading(null)
      setError(`Não foi possível iniciar o login com ${provider === 'google' ? 'Google' : 'Apple'}. Tente novamente.`)
    }
    // Sucesso: navegador é redirecionado; o AuthProvider pega a sessão de volta.
  }

  const busy = loading !== null

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-serif text-3xl text-ink">Haile</h1>
        <p className="mb-7 text-sm text-mist">Inteligência financeira para famílias modernas.</p>

        {mode === 'password' ? (
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-11 rounded-xl border border-line-2 bg-surface px-4 text-sm text-ink outline-none focus:border-indigo"
            />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-11 rounded-xl border border-line-2 bg-surface px-4 text-sm text-ink outline-none focus:border-indigo"
            />
            {error && <p className="text-xs text-red">{error}</p>}
            <Button type="submit" size="lg" disabled={busy} className="mt-1">
              {loading === 'password' ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitMagic} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={magicSent}
              className="h-11 rounded-xl border border-line-2 bg-surface px-4 text-sm text-ink outline-none focus:border-indigo disabled:opacity-60"
            />
            {error && <p className="text-xs text-red">{error}</p>}
            {info && <p className="text-xs text-indigo">{info}</p>}
            {!magicSent && (
              <Button type="submit" size="lg" disabled={busy} className="mt-1">
                {loading === 'magic' ? 'Enviando…' : 'Receber link de acesso'}
              </Button>
            )}
          </form>
        )}

        <Divider label="ou" />

        <div className="flex flex-col gap-2">
          <ProviderButton
            label="Continuar com Google"
            loading={loading === 'google'}
            disabled={busy}
            onClick={() => withProvider('google')}
            icon={<GoogleIcon />}
          />
          <ProviderButton
            label="Continuar com Apple"
            loading={loading === 'apple'}
            disabled={busy}
            onClick={() => withProvider('apple')}
            icon={<AppleIcon />}
          />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'password' ? 'magic' : 'password')
              setError(null)
              setInfo(null)
              setMagicSent(false)
            }}
            className="text-mist hover:text-ink underline-offset-2 hover:underline"
          >
            {mode === 'password' ? 'Prefere link mágico por e-mail?' : 'Voltar pra entrar com senha'}
          </button>
        </div>

        <p className="mt-7 text-center text-xs text-faint">DUO · nova versão (beta)</p>
      </div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-faint">
      <span className="h-px flex-1 bg-line" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function ProviderButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-indigo/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-[18px] w-[18px] items-center justify-center">{icon}</span>
      <span>{loading ? 'Conectando…' : label}</span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.96H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.333z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.96L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
      <path d="M13.485 9.43c-.022-2.354 1.923-3.487 2.011-3.542-1.094-1.6-2.798-1.818-3.405-1.843-1.45-.146-2.83.855-3.566.855-.736 0-1.876-.834-3.085-.811-1.587.024-3.054.92-3.866 2.337-1.65 2.858-.422 7.075 1.187 9.388.79 1.133 1.722 2.405 2.946 2.361 1.183-.047 1.628-.764 3.063-.764 1.434 0 1.836.764 3.084.741 1.273-.022 2.078-1.155 2.852-2.295.9-1.316 1.27-2.591 1.292-2.657-.028-.012-2.484-.953-2.513-3.77zM11.13 2.52C11.785 1.728 12.226.624 12.105-.479c-.946.039-2.092.63-2.77 1.42-.608.7-1.139 1.823-.998 2.903 1.057.082 2.137-.537 2.793-1.325z" />
    </svg>
  )
}
