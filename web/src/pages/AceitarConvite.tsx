import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Users, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useFamily } from '@/store/useFamily'
import { Button } from '@/components/ui/button'

/**
 * Página de aceitação de convite acessada via link mágico do e-mail.
 * URL: /aceitar/:token (onde `token` é o id do row em family_members).
 *
 * Sem login → mostra CTA pra logar (rota /login com `?next=`).
 * Com login → tenta aceitar imediatamente.
 *
 * Importante: o "token" aqui não é um JWT — é o id do convite (uuid).
 * A validação real acontece server-side via RLS + check de email casando.
 * Quem clicou e logou com email diferente do convite recebe rejeição clara.
 */
export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>()
  const { session, loading: authLoading } = useAuth()
  const accept = useFamily((s) => s.accept)
  const navigate = useNavigate()

  const [phase, setPhase] = useState<'idle' | 'accepting' | 'done' | 'expired' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const run = async () => {
    if (!token) {
      setPhase('error')
      setMessage('Link inválido — token ausente.')
      return
    }
    setPhase('accepting')
    const res = await accept(token)
    if ('ok' in res && res.ok) {
      setPhase('done')
      setMessage('Pronto! Você agora faz parte da família. Redirecionando…')
      setTimeout(() => navigate('/meupainel'), 1500)
    } else if ('expired' in res) {
      setPhase('expired')
      setMessage('Esse convite expirou. Peça pra quem te convidou reenviar.')
    } else if ('error' in res) {
      setPhase('error')
      setMessage(res.error)
    } else {
      setPhase('error')
      setMessage('Não foi possível aceitar o convite.')
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!session) return // sem login não tenta aceitar — mostra CTA
    if (phase !== 'idle') return
    // run() é trigger de side-effect assíncrono (chamada de rede + redirect),
    // não derivação de state — disable consciente da regra set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session])

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5 py-10 text-ink">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 shadow-xl shadow-black/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo to-teal text-white">
            <Users size={20} />
          </div>
          <div>
            <div className="font-serif text-xl text-ink">Convite Haile</div>
            <div className="text-[11px] text-mist">Aceitar entrada na família</div>
          </div>
        </div>

        {authLoading ? (
          <p className="text-sm text-mist">Carregando sessão…</p>
        ) : !session ? (
          <>
            <p className="mb-4 text-sm text-mist">
              Você precisa entrar com o e-mail que recebeu o convite. Se já tem conta, faça login;
              se não, abra o link mágico que mandamos por e-mail.
            </p>
            <Link
              to={`/login?next=${encodeURIComponent(`/aceitar/${token ?? ''}`)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-deep"
            >
              <LogIn size={14} /> Fazer login
            </Link>
          </>
        ) : phase === 'accepting' || phase === 'idle' ? (
          <p className="text-sm text-mist">Confirmando convite…</p>
        ) : phase === 'done' ? (
          <div className="rounded-2xl border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
            <CheckCircle2 size={16} className="mr-1 inline" /> {message}
          </div>
        ) : phase === 'expired' ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
              <AlertTriangle size={16} className="mr-1 inline" /> {message}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/meupainel')}>
              Ir pro Meu Painel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
              <AlertTriangle size={16} className="mr-1 inline" /> {message ?? 'Não foi possível aceitar o convite.'}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/meupainel')}>
              Ir pro Meu Painel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
