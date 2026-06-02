import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { useFamily } from '@/store/useFamily'
import type { FamilyRole } from '@/lib/family'

interface Props {
  open: boolean
  onClose: () => void
}

export function ConvidarMembroModal({ open, onClose }: Props) {
  const invite = useFamily((s) => s.invite)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<FamilyRole>('member')
  const [pessoaName, setPessoaName] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function reset() {
    setEmail('')
    setRole('member')
    setPessoaName('')
    setSendEmail(true)
    setError(null)
    setSuccess(null)
    setBusy(false)
  }

  function handleClose() {
    if (busy) return
    reset()
    onClose()
  }

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    const emailTrim = email.trim().toLowerCase()
    if (!emailTrim) return setError('Informe um e-mail')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return setError('E-mail inválido')
    setBusy(true)
    const res = await invite(emailTrim, role, pessoaName.trim() || undefined, { sendEmail })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (sendEmail) {
      const emailErr = res.emailResult?.error
      if (emailErr) {
        // Convite criado mas e-mail falhou — sinaliza pro user.
        const errMsg = typeof emailErr === 'string' ? emailErr : emailErr?.message ?? 'falha desconhecida'
        setSuccess(`Convite registrado, mas o e-mail falhou: ${errMsg}`)
      } else {
        setSuccess(`Convite enviado pra ${emailTrim}.`)
      }
    } else {
      setSuccess(`Convite registrado pra ${emailTrim} (sem e-mail).`)
    }
    setTimeout(() => {
      reset()
      onClose()
    }, 1200)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Convidar membro da família">
      <div className="flex flex-col gap-4">
        <Field label="E-mail" hint="A pessoa vai receber um link mágico pra entrar.">
          <Input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@email.com"
          />
        </Field>
        <Field label="Como você chama essa pessoa? (opcional)" hint="Aparece nos cards de Pessoa do app.">
          <Input
            type="text"
            value={pessoaName}
            onChange={(e) => setPessoaName(e.target.value)}
            placeholder="Ex.: Mariana"
          />
        </Field>
        <Field label="Papel" hint="Editor pode lançar; Visualizador só consulta.">
          <Select value={role} onChange={(e) => setRole(e.target.value as FamilyRole)}>
            <option value="member">Membro (lança e edita)</option>
            <option value="editor">Editor (lança e edita)</option>
            <option value="viewer">Visualizador (somente leitura)</option>
          </Select>
        </Field>

        <label className="flex items-start gap-2 rounded-xl border border-line bg-elevated/50 p-3 text-sm text-mist">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo"
          />
          <span>
            <span className="font-medium text-ink">Enviar e-mail agora</span>
            <br />
            <span className="text-[11px] text-faint">
              Se desmarcar, o convite fica registrado e você pode reenviar depois.
            </span>
          </span>
        </label>

        {error && (
          <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-green/40 bg-green/10 px-3 py-2 text-sm text-green">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={busy}>
            {sendEmail ? <Send size={14} /> : <Mail size={14} />}
            {busy ? 'Enviando…' : sendEmail ? 'Enviar convite' : 'Registrar convite'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
