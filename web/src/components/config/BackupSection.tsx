import { useRef, useState } from 'react'
import { Download, Upload, AlertTriangle, Trash2 } from 'lucide-react'
import type { UserData } from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'

function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Critério mínimo pra aceitar um JSON como "blob do Haile". */
function looksLikeUserData(obj: unknown): obj is UserData {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    Array.isArray(o.receitas) ||
    Array.isArray(o.despesas) ||
    Array.isArray(o.contas) ||
    Array.isArray(o.metas) ||
    Array.isArray(o.contratos)
  )
}

const LOCAL_KEY = 'haile_duo_user_data'

export function BackupSection() {
  const data = useData((s) => s.data)
  const replaceAll = useData((s) => s.replaceAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<
    | null
    | { kind: 'ok'; text: string }
    | { kind: 'err'; text: string }
  >(null)

  function handleExport() {
    setMessage(null)
    try {
      const json = JSON.stringify(data ?? {}, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `haile-backup-${todayStamp()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMessage({ kind: 'ok', text: 'Backup exportado.' })
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Falha ao exportar.' })
    }
  }

  function handleImportClick() {
    setMessage(null)
    fileRef.current?.click()
  }

  function handleImportFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result
      if (typeof raw !== 'string') {
        setMessage({ kind: 'err', text: 'Arquivo inválido.' })
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        setMessage({ kind: 'err', text: 'Arquivo não é um JSON válido.' })
        return
      }
      if (!looksLikeUserData(parsed)) {
        setMessage({
          kind: 'err',
          text: 'JSON não parece um backup do Haile (precisa ter receitas, despesas ou contas).',
        })
        return
      }
      const ok = window.confirm(
        'Importar este backup vai SUBSTITUIR todos os seus dados atuais. Continuar?',
      )
      if (!ok) return
      replaceAll(parsed)
      setMessage({ kind: 'ok', text: 'Backup importado. Seus dados foram substituídos.' })
    }
    reader.onerror = () => setMessage({ kind: 'err', text: 'Falha ao ler o arquivo.' })
    reader.readAsText(file)
  }

  function handleReset() {
    setMessage(null)
    const ok1 = window.confirm(
      'Isso vai APAGAR todos os seus dados (lançamentos, contas, metas, configurações). Não dá pra desfazer. Continuar?',
    )
    if (!ok1) return
    const confirmText = window.prompt('Digite RESETAR (em maiúsculas) para confirmar:')
    if (confirmText !== 'RESETAR') {
      setMessage({ kind: 'err', text: 'Confirmação não corresponde — reset cancelado.' })
      return
    }
    replaceAll({})
    try {
      localStorage.removeItem(LOCAL_KEY)
    } catch {
      /* quota / privacidade — ignora */
    }
    setMessage({ kind: 'ok', text: 'Dados resetados.' })
  }

  // Resumo rápido pra o usuário entender o que tem.
  const counts = {
    receitas: data?.receitas?.length ?? 0,
    despesas: data?.despesas?.length ?? 0,
    contas: data?.contas?.length ?? 0,
    metas: data?.metas?.length ?? 0,
    contratos: data?.contratos?.length ?? 0,
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Backup</h2>
        <p className="mt-1 text-sm text-mist">
          Exporte seus dados em JSON, importe um backup ou resete tudo.
          Útil pra migrar da versão antiga do app.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink">Seus dados agora</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line-2 bg-bg px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-faint">{k}</dt>
              <dd className="text-lg font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Exportar JSON</h3>
            <p className="text-xs text-mist">
              Baixa um arquivo com tudo. Guarde em local seguro.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download size={14} />
            Exportar backup
          </Button>
        </div>
      </div>

      {/* Import */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Importar JSON</h3>
            <p className="text-xs text-mist">
              Substitui seus dados atuais pelo conteúdo do arquivo.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              handleImportFile(f)
              // limpa pra permitir re-importar o mesmo arquivo
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
          <Button type="button" variant="outline" onClick={handleImportClick}>
            <Upload size={14} />
            Importar backup
          </Button>
        </div>
      </div>

      {/* Reset (destrutivo) */}
      <div className="rounded-2xl border border-red/30 bg-red/5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Resetar dados</h3>
              <p className="mt-1 text-xs text-mist">
                Apaga todos os seus lançamentos, contas, metas e configurações.
                Não dá pra desfazer. Exporte um backup antes, por garantia.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-red/50 text-red hover:bg-red/10"
          >
            <Trash2 size={14} />
            Resetar tudo
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
    </div>
  )
}
