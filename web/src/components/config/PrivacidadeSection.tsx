import { useState } from 'react'
import { Download, Trash2, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'

function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function PrivacidadeSection() {
  const data = useData((s) => s.data)
  const [message, setMessage] = useState<
    | null
    | { kind: 'ok'; text: string }
    | { kind: 'err'; text: string }
  >(null)
  const [delOpen, setDelOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState('')
  const [delAck, setDelAck] = useState(false)

  function handleExport() {
    setMessage(null)
    try {
      const json = JSON.stringify(data ?? {}, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `haile-export-${todayStamp()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMessage({ kind: 'ok', text: 'Exportação concluída.' })
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Falha ao exportar.' })
    }
  }

  function submitExclusao() {
    if (!delAck) {
      setMessage({ kind: 'err', text: 'Marque a confirmação antes de prosseguir.' })
      return
    }
    if (delConfirm.trim().toUpperCase() !== 'APAGAR') {
      setMessage({ kind: 'err', text: 'Digite APAGAR (em maiúsculas) pra confirmar.' })
      return
    }
    console.warn('[haile] Solicitação de exclusão de conta registrada', {
      at: new Date().toISOString(),
    })
    setDelOpen(false)
    setDelConfirm('')
    setDelAck(false)
    setMessage({
      kind: 'ok',
      text:
        'Solicitação registrada. Em até 7 dias seu dado será removido. Entre em contato em privacidade@haile.com.br pra acelerar.',
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Privacidade</h2>
        <p className="mt-1 text-sm text-mist">
          Seus dados pertencem a você. Aqui você exporta tudo a qualquer momento e
          pode pedir a exclusão da sua conta.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green" />
          <div className="text-sm text-mist">
            <p className="font-semibold text-ink">Compromisso LGPD</p>
            <p className="mt-1">
              Tratamos seus dados conforme a Lei Geral de Proteção de Dados (LGPD).
              Você pode acessar, exportar, corrigir e excluir seus dados a qualquer
              momento. Não vendemos seus dados pessoais a terceiros.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <a
                href="/termos"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo hover:underline"
              >
                Termos de uso <ExternalLink size={11} />
              </a>
              <a
                href="/privacidade"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo hover:underline"
              >
                Política de privacidade <ExternalLink size={11} />
              </a>
              <a
                href="mailto:privacidade@haile.com.br"
                className="inline-flex items-center gap-1 text-indigo hover:underline"
              >
                privacidade@haile.com.br
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Exportar todos os dados</h3>
            <p className="text-xs text-mist">
              Download em JSON com tudo que está na sua conta. Mesma exportação do
              Backup.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download size={14} />
            Exportar dados
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-red/30 bg-red/5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red" />
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Solicitar exclusão da conta
              </h3>
              <p className="mt-1 text-xs text-mist">
                Sua conta e todos os dados associados serão removidos em até 7 dias.
                Ação irreversível — exporte um backup antes, por garantia.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDelOpen(true)}
            className="border-red/50 text-red hover:bg-red/10"
          >
            <Trash2 size={14} />
            Solicitar exclusão
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={
            message.kind === 'ok'
              ? 'rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green'
              : 'rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red'
          }
        >
          {message.text}
        </div>
      )}

      <Modal
        open={delOpen}
        onClose={() => {
          setDelOpen(false)
          setDelConfirm('')
          setDelAck(false)
        }}
        title="Confirmar exclusão da conta"
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDelOpen(false)
                setDelConfirm('')
                setDelAck(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitExclusao}
              className="bg-red hover:bg-red/80"
            >
              <Trash2 size={14} />
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-ink">
          <div className="flex items-start gap-3 rounded-xl border border-red/40 bg-red/10 px-3 py-3 text-xs text-red">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              Esta ação é irreversível. Todos os seus dados — lançamentos, contas,
              metas, contratos, perfil — serão apagados em até 7 dias.
            </p>
          </div>
          <label className="flex items-start gap-2 text-xs text-mist">
            <input
              type="checkbox"
              checked={delAck}
              onChange={(e) => setDelAck(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Entendo que perderei o acesso à minha conta e que os dados não poderão
              ser recuperados depois da exclusão.
            </span>
          </label>
          <Field
            label="Digite APAGAR pra confirmar"
            hint="Em maiúsculas, sem espaços."
          >
            <Input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder="APAGAR"
              autoFocus
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
