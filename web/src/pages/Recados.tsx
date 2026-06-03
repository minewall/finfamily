import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import {
  countNaoLidos,
  getRecados,
  type Recado,
  type RecadoPrioridade,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'

type Filtro = 'todos' | 'nao_lidos' | 'urgente' | 'aviso' | 'info'

const FILTER_LABEL: Record<Filtro, string> = {
  todos: 'Todos',
  nao_lidos: 'Não lidos',
  urgente: 'Urgentes',
  aviso: 'Avisos',
  info: 'Info',
}

const PRIORIDADE_VISUAL: Record<RecadoPrioridade, { color: string; Icon: typeof AlertCircle; label: string }> = {
  urgente: { color: 'var(--color-red)', Icon: AlertTriangle, label: 'Urgente' },
  aviso:   { color: 'var(--color-amber)', Icon: AlertCircle,   label: 'Aviso' },
  info:    { color: 'var(--color-indigo)', Icon: Info,          label: 'Info' },
}

function fmtRelTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

export default function Recados() {
  const navigate = useNavigate()
  const data = useData((s) => s.data)
  const loading = useData((s) => s.loading)
  const load = useData((s) => s.load)
  const addRecado = useData((s) => s.addRecado)
  const marcarRecadoLido = useData((s) => s.marcarRecadoLido)
  const marcarTodosLidos = useData((s) => s.marcarTodosLidos)
  const deleteRecado = useData((s) => s.deleteRecado)
  const getFlag = useData((s) => s.getFlag)
  const setFlag = useData((s) => s.setFlag)

  const [filtro, setFiltro] = useState<Filtro>('todos')

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  // Bootstrap demo — 2 recados de boas-vindas na 1ª visita
  useEffect(() => {
    if (!data) return
    if (getFlag('recadosBootstrap', false)) return
    setFlag('recadosBootstrap', true)
    addRecado({
      tipo: 'aviso',
      titulo: 'Bem-vindo aos Recados do Haile',
      corpo:
        'Aqui você vai receber alertas e oportunidades personalizadas, sempre que o Haile detectar algo relevante na sua vida financeira.',
      prioridade: 'aviso',
      origem: 'sistema',
    })
    addRecado({
      tipo: 'info',
      titulo: 'Comece cadastrando seus compromissos',
      corpo:
        'Adicione suas despesas recorrentes e dívidas em Compromissos. Assim o Haile já consegue calcular seu impacto mensal e te avisar de vencimentos.',
      prioridade: 'info',
      origem: 'sistema',
      action: { kind: 'navigate', to: '/compromissos', label: 'Abrir Compromissos' },
    })
  }, [data, getFlag, setFlag, addRecado])

  const totalRecados = data?.recados?.length ?? 0
  const naoLidos = useMemo(() => (data ? countNaoLidos(data) : 0), [data])

  const filtrados = useMemo(() => {
    if (!data) return []
    if (filtro === 'todos') return getRecados(data)
    if (filtro === 'nao_lidos') return getRecados(data, { apenasNaoLidos: true })
    return getRecados(data, { prioridade: filtro as RecadoPrioridade })
  }, [data, filtro])

  function handleAction(r: Recado) {
    if (!r.lidoEm) marcarRecadoLido(r.id)
    if (r.action?.kind === 'navigate' && r.action.to) {
      navigate(r.action.to)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-indigo) 0%, var(--color-teal) 100%)' }}
          >
            <Bell size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Recados do Haile</h1>
            <p className="text-sm text-mist">
              {naoLidos > 0 ? (
                <span className="font-semibold text-indigo">
                  {naoLidos} não lido{naoLidos !== 1 ? 's' : ''} · {' '}
                </span>
              ) : null}
              insights e recomendações personalizadas
            </p>
          </div>
        </div>
        {naoLidos > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodosLidos}>
            <CheckCheck size={14} /> Marcar todos como lidos
          </Button>
        )}
      </header>

      {/* Filtros */}
      <div className="mb-5 inline-flex flex-wrap rounded-xl border border-line bg-surface p-1">
        {(Object.keys(FILTER_LABEL) as Filtro[]).map((f) => {
          const active = filtro === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ' +
                (active ? 'bg-elevated text-ink' : 'text-mist hover:text-ink')
              }
            >
              {FILTER_LABEL[f]}
              {f === 'nao_lidos' && naoLidos > 0 && (
                <span
                  className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red px-1.5 text-[10px] font-bold leading-none text-white"
                  style={{ height: 18 }}
                >
                  {naoLidos}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}

      {/* Empty state */}
      {filtrados.length === 0 && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <Bell className="mx-auto mb-3 text-faint" size={28} />
          <p className="text-sm text-mist">
            {totalRecados === 0
              ? 'Nenhum recado por aqui ainda.'
              : `Nenhum recado em ${FILTER_LABEL[filtro].toLowerCase()}.`}
          </p>
        </div>
      )}

      {/* Lista de cards */}
      {filtrados.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtrados.map((r) => {
            const v = PRIORIDADE_VISUAL[r.prioridade] ?? PRIORIDADE_VISUAL.info
            const lido = !!r.lidoEm
            return (
              <li
                key={r.id}
                className={
                  'rounded-2xl border bg-surface p-4 transition-colors ' +
                  (lido ? 'border-line' : 'border-line-2 shadow-sm')
                }
                style={{ borderLeft: `3px solid ${v.color}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg"
                    style={{ background: `${v.color}20`, color: v.color }}
                  >
                    <v.Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: `${v.color}20`, color: v.color }}
                      >
                        {v.label}
                      </span>
                      {!lido && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: v.color }}
                          aria-label="não lido"
                        />
                      )}
                      <span className="text-[11px] text-faint">{fmtRelTime(r.criadoEm)}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-ink">{r.titulo}</h3>
                    <p className="mt-1 text-sm text-mist">{r.corpo}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.action?.kind === 'navigate' && r.action.to && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(r)}>
                          {r.action.label ?? 'Abrir'}
                        </Button>
                      )}
                      {!lido && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarRecadoLido(r.id)}
                        >
                          <CheckCheck size={12} /> Marcar como lido
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red hover:text-red"
                        onClick={() => deleteRecado(r.id)}
                      >
                        <Trash2 size={12} /> Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
