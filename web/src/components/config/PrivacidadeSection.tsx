import { useEffect, useState } from 'react'
import {
  Download,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  ListChecks,
  Loader2,
} from 'lucide-react'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import {
  createLgpdRequest,
  listMyLgpdRequests,
  type LgpdRequest,
} from '@/lib/lgpd'

function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TYPE_LABEL: Record<LgpdRequest['request_type'], string> = {
  export: 'Exportação',
  delete: 'Exclusão',
  rectify: 'Retificação',
  object: 'Oposição',
}

const STATUS_LABEL: Record<
  LgpdRequest['status'],
  { label: string; tone: string }
> = {
  pending: { label: 'Em análise', tone: 'text-amber bg-amber/10 border-amber/30' },
  completed: { label: 'Concluída', tone: 'text-green bg-green/10 border-green/30' },
  rejected: { label: 'Recusada', tone: 'text-red bg-red/10 border-red/30' },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
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
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null)
  const [requests, setRequests] = useState<LgpdRequest[]>([])
  const [loadingReqs, setLoadingReqs] = useState(true)

  async function refreshRequests() {
    setLoadingReqs(true)
    try {
      const list = await listMyLgpdRequests()
      setRequests(list)
    } catch (e) {
      setRequests([])
      setMessage({
        kind: 'err',
        text:
          e instanceof Error
            ? `Não foi possível carregar suas solicitações: ${e.message}`
            : 'Não foi possível carregar suas solicitações.',
      })
    } finally {
      setLoadingReqs(false)
    }
  }

  // Fetch inicial das solicitações — padrão data-fetching legítimo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshRequests()
  }, [])

  async function handleExport() {
    setMessage(null)
    setBusy('export')
    try {
      await createLgpdRequest('export')
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
      setMessage({
        kind: 'ok',
        text: 'Exportação baixada e solicitação registrada. A versão completa (com histórico de família) chega por e-mail em até 30 dias.',
      })
      await refreshRequests()
    } catch (e) {
      setMessage({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Falha ao exportar.',
      })
    } finally {
      setBusy(null)
    }
  }

  async function submitExclusao() {
    if (!delAck) {
      setMessage({ kind: 'err', text: 'Marque a confirmação antes de prosseguir.' })
      return
    }
    if (delConfirm.trim().toLowerCase() !== 'excluir minha conta') {
      setMessage({
        kind: 'err',
        text: 'Digite "excluir minha conta" exatamente como está pra confirmar.',
      })
      return
    }
    setBusy('delete')
    try {
      await createLgpdRequest('delete')
      setDelOpen(false)
      setDelConfirm('')
      setDelAck(false)
      setMessage({
        kind: 'ok',
        text: 'Solicitação registrada. Após confirmação do admin, todos os seus dados serão deletados permanentemente. Em caso de urgência, fale com privacidade@haile.com.br.',
      })
      await refreshRequests()
    } catch (e) {
      setMessage({
        kind: 'err',
        text:
          e instanceof Error
            ? e.message
            : 'Não foi possível registrar a solicitação.',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Privacidade</h2>
        <p className="mt-1 text-sm text-mist">
          Seus dados pertencem a você. Aqui você exerce os direitos garantidos pela
          LGPD (Lei 13.709/2018).
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green" />
          <div className="text-sm text-mist">
            <p className="font-semibold text-ink">Seus direitos (Art. 18 da LGPD)</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Acesso aos seus dados</li>
              <li>Portabilidade — exportar tudo em formato aberto</li>
              <li>Exclusão definitiva (right to be forgotten)</li>
              <li>Retificação de informações imprecisas</li>
              <li>Oposição ao tratamento</li>
            </ul>
            <p className="mt-3">Não vendemos seus dados pessoais a terceiros.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <a
                href="/termos.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo hover:underline"
              >
                Termos de uso <ExternalLink size={11} />
              </a>
              <a
                href="/privacidade.html"
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
            <h3 className="text-sm font-semibold text-ink">Exportar meus dados</h3>
            <p className="text-xs text-mist">
              Download imediato em JSON com tudo que está na sua conta. A solicitação
              fica registrada pra auditoria e a versão completa (com histórico de
              família) é enviada por e-mail em até 30 dias.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={busy !== null}
          >
            {busy === 'export' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
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
                Excluir minha conta
              </h3>
              <p className="mt-1 text-xs text-mist">
                Após confirmação do admin, todos os seus dados serão deletados
                permanentemente. Isso é irreversível — exporte um backup antes, por
                garantia.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDelOpen(true)}
            disabled={busy !== null}
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

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-mist" />
          <h3 className="text-sm font-semibold text-ink">Solicitações em andamento</h3>
        </div>
        <div className="mt-3 text-sm">
          {loadingReqs ? (
            <p className="text-xs text-mist">Carregando…</p>
          ) : requests.length === 0 ? (
            <p className="text-xs text-mist">
              Você ainda não fez nenhuma solicitação.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((r) => {
                const st = STATUS_LABEL[r.status]
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {TYPE_LABEL[r.request_type]}
                      </p>
                      <p className="text-xs text-mist">
                        Solicitado em {formatDate(r.requested_at)}
                        {r.completed_at
                          ? ` · concluído em ${formatDate(r.completed_at)}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}
                    >
                      {st.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

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
              disabled={busy === 'delete'}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitExclusao}
              disabled={busy === 'delete'}
              className="bg-red hover:bg-red/80"
            >
              {busy === 'delete' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-ink">
          <div className="flex items-start gap-3 rounded-xl border border-red/40 bg-red/10 px-3 py-3 text-xs text-red">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              Esta ação é irreversível. Após confirmação do admin, todos os seus
              dados — lançamentos, contas, metas, compromissos, perfil — serão
              apagados permanentemente.
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
            label='Digite "excluir minha conta" pra confirmar'
            hint="Exatamente como está, em minúsculas."
          >
            <Input
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              placeholder="excluir minha conta"
              autoFocus
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
