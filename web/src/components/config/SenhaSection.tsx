import { useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { checkPwnedPassword } from '@haile/shared'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'submitting' }
  | { kind: 'pwned'; count: number }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

const MIN_LEN = 8

export function SenhaSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [allowPwned, setAllowPwned] = useState(false)

  const busy = status.kind === 'checking' || status.kind === 'submitting'

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setAllowPwned(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus({ kind: 'idle' })

    if (next.length < MIN_LEN) {
      setStatus({ kind: 'error', message: `Mínimo de ${MIN_LEN} caracteres.` })
      return
    }
    if (next !== confirm) {
      setStatus({ kind: 'error', message: 'As senhas não conferem.' })
      return
    }
    if (next === current) {
      setStatus({ kind: 'error', message: 'A nova senha precisa ser diferente da atual.' })
      return
    }

    // Checagem HIBP a menos que o usuário já tenha optado por prosseguir.
    if (!allowPwned) {
      setStatus({ kind: 'checking' })
      const result = await checkPwnedPassword(next)
      if (result.pwned) {
        setStatus({ kind: 'pwned', count: result.count })
        return
      }
    }

    setStatus({ kind: 'submitting' })
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) {
      setStatus({ kind: 'error', message: error.message })
      return
    }
    setStatus({ kind: 'success' })
    reset()
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Senha</h2>
        <p className="mt-1 text-sm text-mist">
          Troque sua senha. Antes de salvar, checamos contra vazamentos públicos
          conhecidos (Have I Been Pwned) — sua senha nunca sai do dispositivo.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-line bg-surface p-6"
      >
        <Field label="Senha atual" hint="Usada como confirmação adicional.">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field
          label="Nova senha"
          hint={`Mínimo ${MIN_LEN} caracteres. Combine letras, números e símbolos.`}
        >
          <Input
            type="password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value)
              setAllowPwned(false)
              if (status.kind === 'pwned' || status.kind === 'error') setStatus({ kind: 'idle' })
            }}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {status.kind === 'pwned' && (
          <div className="rounded-lg border border-red/40 bg-red/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red" />
              <div className="space-y-2 text-sm text-ink">
                <p className="font-medium text-red">
                  Esta senha já apareceu em {status.count.toLocaleString('pt-BR')} vazamento(s).
                </p>
                <p className="text-mist">
                  Recomendamos escolher outra. Se quiser usar mesmo assim, marque a caixa abaixo.{' '}
                  <a
                    href="https://haveibeenpwned.com/Passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo underline"
                  >
                    Saiba mais
                  </a>
                  .
                </p>
                <label className="flex items-center gap-2 text-xs text-mist">
                  <input
                    type="checkbox"
                    checked={allowPwned}
                    onChange={(e) => setAllowPwned(e.target.checked)}
                  />
                  Entendo o risco e quero prosseguir com esta senha.
                </label>
              </div>
            </div>
          </div>
        )}

        {status.kind === 'error' && (
          <div className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {status.message}
          </div>
        )}

        {status.kind === 'success' && (
          <div className="flex items-center gap-2 rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
            <ShieldCheck size={16} />
            Senha alterada com sucesso.
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {status.kind === 'checking'
              ? 'Verificando...'
              : status.kind === 'submitting'
                ? 'Salvando...'
                : 'Trocar senha'}
          </Button>
        </div>
      </form>
    </div>
  )
}
