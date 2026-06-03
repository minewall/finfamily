import { useEffect, useState } from 'react'
import {
  Plus,
  Laptop2,
  Car,
  Home,
  Coins,
  AlertTriangle,
  Landmark,
} from 'lucide-react'
import {
  currencyBRL,
  totalPatrimonioLiquido,
  totalAtivos,
  totalEquipamentos,
  totalVeiculos,
  totalImoveis,
  totalEquityImoveis,
  totalPassivos,
  totalReservas,
  totalCriptoFiat,
  equipamentoValorEstimado,
  equipamentoCustoAnual,
  veiculoValorEstimado,
  veiculoCustoAnual,
  veiculoIdadeAnos,
  imovelValorEstimado,
  imovelEquity,
  imovelCustoAnual,
  imovelReceitaAnual,
  imovelRentabilidadeAluguel,
  reservaValorAtual,
  ativoValorBRL,
  type Equipamento,
  type Veiculo,
  type Imovel,
  type Ativo,
  type Passivo,
  type Cotacoes,
} from '@haile/shared'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { EquipamentoModal } from '@/components/patrimonio/EquipamentoModal'
import { VeiculoModal } from '@/components/patrimonio/VeiculoModal'
import { ImovelModal } from '@/components/patrimonio/ImovelModal'
import { AtivoModal } from '@/components/patrimonio/AtivoModal'
import { PassivoModal } from '@/components/patrimonio/PassivoModal'

type Tab = 'equipamentos' | 'veiculos' | 'imoveis' | 'ativos' | 'passivos'

const TAB_LABEL: Record<Tab, string> = {
  equipamentos: 'Equipamentos',
  veiculos: 'Veículos',
  imoveis: 'Imóveis',
  ativos: 'Ativos',
  passivos: 'Passivos',
}

const TAB_ICON: Record<Tab, React.ReactNode> = {
  equipamentos: <Laptop2 size={14} />,
  veiculos: <Car size={14} />,
  imoveis: <Home size={14} />,
  ativos: <Coins size={14} />,
  passivos: <AlertTriangle size={14} />,
}

function isReservaAtivo(a: Ativo): boolean {
  if (a.kind === 'reserva') return true
  if (a.kind === 'cripto' || a.kind === 'fiat') return false
  if (a.platform != null || a.qty != null || a.unitPrice != null) return false
  return a.valorInvestido != null || a.rendimento != null || a.nome != null
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_negociacao: 'Em negociação',
  acordado: 'Acordado',
  quitado: 'Quitado',
}

const STATUS_COLOR: Record<string, string> = {
  pendente: 'text-amber-500',
  em_negociacao: 'text-indigo',
  acordado: 'text-teal',
  quitado: 'text-green',
}

export default function Patrimonio() {
  const { data, loading, load, syncStatus } = useData()
  const [tab, setTab] = useState<Tab>('ativos')

  const [eqEditing, setEqEditing] = useState<Equipamento | null>(null)
  const [eqOpen, setEqOpen] = useState(false)
  const [vEditing, setVEditing] = useState<Veiculo | null>(null)
  const [vOpen, setVOpen] = useState(false)
  const [imEditing, setImEditing] = useState<Imovel | null>(null)
  const [imOpen, setImOpen] = useState(false)
  const [aEditing, setAEditing] = useState<Ativo | null>(null)
  const [aOpen, setAOpen] = useState(false)
  const [pEditing, setPEditing] = useState<Passivo | null>(null)
  const [pOpen, setPOpen] = useState(false)

  useEffect(() => {
    if (!data && !loading) void load()
  }, [data, loading, load])

  const cotacoes = (data?.settings ?? {}) as Cotacoes

  const equipamentos = (data?.equipamentos ?? []) as Equipamento[]
  const veiculos = (data?.veiculos ?? []) as Veiculo[]
  const imoveis = (data?.imoveis ?? []) as Imovel[]
  const ativos = (data?.ativos ?? []) as Ativo[]
  const passivos = (data?.passivos ?? []) as Passivo[]

  const totAtivos = totalAtivos(data, cotacoes)
  const totEquip = totalEquipamentos(data)
  const totVeic = totalVeiculos(data)
  const totImov = totalImoveis(data)
  const totEquityImov = totalEquityImoveis(data)
  const totPass = totalPassivos(data)
  const totLiquido = totalPatrimonioLiquido(data, cotacoes)
  const totReservas = totalReservas(data)
  const totCripto = totalCriptoFiat(data, cotacoes)

  function openAdd() {
    switch (tab) {
      case 'equipamentos': setEqEditing(null); setEqOpen(true); break
      case 'veiculos': setVEditing(null); setVOpen(true); break
      case 'imoveis': setImEditing(null); setImOpen(true); break
      case 'ativos': setAEditing(null); setAOpen(true); break
      case 'passivos': setPEditing(null); setPOpen(true); break
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Patrimônio</h1>
          <p className="text-sm text-mist">
            Ativos, dívidas, imóveis, veículos e equipamentos.
            {syncStatus === 'syncing' && <span className="ml-2 text-faint">· salvando…</span>}
            {syncStatus === 'synced' && <span className="ml-2 text-green/80">· sincronizado</span>}
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Adicionar
        </Button>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate">
            <Landmark size={14} /> Patrimônio Líquido
          </div>
          <div className={'mt-2 font-mono text-[26px] font-extrabold ' + (totLiquido >= 0 ? 'text-indigo' : 'text-red')}>
            {currencyBRL(totLiquido)}
          </div>
          <div className="text-[11px] text-faint">Ativos + bens − passivos</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate">Ativos</div>
          <div className="mt-2 font-mono text-[22px] font-extrabold text-green">{currencyBRL(totAtivos)}</div>
          <div className="text-[11px] text-faint">
            Reservas {currencyBRL(totReservas)} · Cripto/FIAT {currencyBRL(totCripto)}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate">Equity em imóveis</div>
          <div className="mt-2 font-mono text-[22px] font-extrabold text-teal">{currencyBRL(totEquityImov)}</div>
          <div className="text-[11px] text-faint">
            Valor estimado {currencyBRL(totImov)} · {imoveis.length} {imoveis.length === 1 ? 'imóvel' : 'imóveis'}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate">Passivos</div>
          <div className={'mt-2 font-mono text-[22px] font-extrabold ' + (totPass > 0 ? 'text-red' : 'text-mist')}>
            {currencyBRL(totPass)}
          </div>
          <div className="text-[11px] text-faint">
            Veículos {currencyBRL(totVeic)} · Equip. {currencyBRL(totEquip)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ' +
                (active
                  ? 'border-indigo bg-indigo text-white'
                  : 'border-line bg-surface text-mist hover:text-ink')
              }
            >
              {TAB_ICON[t]}
              {TAB_LABEL[t]}
            </button>
          )
        })}
      </div>

      {loading && !data && <p className="text-mist">Carregando…</p>}

      {/* Equipamentos */}
      {tab === 'equipamentos' && (
        equipamentos.length === 0
          ? <EmptyState label="Nenhum equipamento cadastrado." onAdd={() => { setEqEditing(null); setEqOpen(true) }} />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {equipamentos.map((e) => {
                const valor = equipamentoValorEstimado(e)
                const custoAno = equipamentoCustoAnual(e)
                const dep = (e.depreciacaoAnualPct ?? 20)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { setEqEditing(e); setEqOpen(true) }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                    style={{ borderTop: '3px solid var(--color-indigo)' }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                      {(e.categoria as string) ?? 'eletronico'}
                    </div>
                    <div className="text-[15px] font-bold text-ink">{e.nome}</div>
                    <div className="mb-3 text-[11px] text-faint">
                      {e.dataCompra ? new Date(e.dataCompra + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} · Deprec. {dep}%/a.a.
                    </div>
                    <div className="text-[11px] text-mist">Valor estimado</div>
                    <div className="font-mono text-[20px] font-extrabold text-indigo">{currencyBRL(valor)}</div>
                    {custoAno > 0 && (
                      <div className="mt-1 text-[11px] text-mist">
                        Custo anual <span className="font-mono font-semibold text-ink">{currencyBRL(custoAno)}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
      )}

      {/* Veículos */}
      {tab === 'veiculos' && (
        veiculos.length === 0
          ? <EmptyState label="Nenhum veículo cadastrado." onAdd={() => { setVEditing(null); setVOpen(true) }} />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {veiculos.map((v) => {
                const valor = veiculoValorEstimado(v)
                const custoAno = veiculoCustoAnual(v)
                const idade = veiculoIdadeAnos(v)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVEditing(v); setVOpen(true) }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                    style={{ borderTop: '3px solid var(--color-amber)' }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                      {v.marca} {v.ano ? `· ${v.ano}` : ''}
                    </div>
                    <div className="text-[15px] font-bold text-ink">{v.apelido || v.modelo}</div>
                    <div className="mb-3 text-[11px] text-faint">
                      {v.modelo}{idade ? ` · ${idade.toFixed(1)} anos de uso` : ''}
                    </div>
                    <div className="text-[11px] text-mist">Valor estimado</div>
                    <div className="font-mono text-[20px] font-extrabold" style={{ color: 'var(--color-amber)' }}>
                      {currencyBRL(valor)}
                    </div>
                    {custoAno > 0 && (
                      <div className="mt-1 text-[11px] text-mist">
                        Custo anual <span className="font-mono font-semibold text-ink">{currencyBRL(custoAno)}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
      )}

      {/* Imóveis */}
      {tab === 'imoveis' && (
        imoveis.length === 0
          ? <EmptyState label="Nenhum imóvel cadastrado." onAdd={() => { setImEditing(null); setImOpen(true) }} />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imoveis.map((im) => {
                const valor = imovelValorEstimado(im)
                const equity = imovelEquity(im)
                const custoAno = imovelCustoAnual(im)
                const receitaAno = imovelReceitaAnual(im)
                const rent = imovelRentabilidadeAluguel(im)
                return (
                  <button
                    key={im.id}
                    type="button"
                    onClick={() => { setImEditing(im); setImOpen(true) }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                    style={{ borderTop: '3px solid var(--color-teal)' }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                      {(im.tipo as string) ?? 'casa'}
                    </div>
                    <div className="text-[15px] font-bold text-ink">{im.apelido || im.endereco}</div>
                    <div className="mb-3 text-[11px] text-faint">
                      {im.endereco || '—'}
                    </div>
                    <div className="text-[11px] text-mist">Valor estimado</div>
                    <div className="font-mono text-[20px] font-extrabold text-teal">{currencyBRL(valor)}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-mist">Equity</div>
                        <div className={'font-mono font-bold ' + (equity >= 0 ? 'text-green' : 'text-red')}>
                          {currencyBRL(equity)}
                        </div>
                      </div>
                      {custoAno > 0 && (
                        <div>
                          <div className="text-mist">Custo/ano</div>
                          <div className="font-mono font-semibold text-ink">{currencyBRL(custoAno)}</div>
                        </div>
                      )}
                      {receitaAno > 0 && (
                        <div>
                          <div className="text-mist">Aluguel/ano</div>
                          <div className="font-mono font-semibold text-green">{currencyBRL(receitaAno)}</div>
                        </div>
                      )}
                      {rent > 0 && (
                        <div>
                          <div className="text-mist">Rentab.</div>
                          <div className="font-mono font-semibold text-indigo">{(rent * 100).toFixed(2)}% a.a.</div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
      )}

      {/* Ativos */}
      {tab === 'ativos' && (
        ativos.length === 0
          ? <EmptyState label="Nenhum ativo cadastrado." onAdd={() => { setAEditing(null); setAOpen(true) }} />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ativos.map((a) => {
                const isRes = isReservaAtivo(a)
                if (isRes) {
                  const atual = reservaValorAtual(a)
                  const ganho = atual - (a.valorInvestido || 0)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setAEditing(a); setAOpen(true) }}
                      className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                      style={{ borderTop: '3px solid var(--color-green)' }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{a.tipo || 'Investimento'}</div>
                      <div className="text-[15px] font-bold text-ink">{a.nome || '—'}</div>
                      <div className="mb-3 text-[11px] text-faint">
                        Investido <span className="font-mono">{currencyBRL(a.valorInvestido || 0)}</span>
                      </div>
                      <div className="text-[11px] text-mist">Valor atual</div>
                      <div className="font-mono text-[20px] font-extrabold text-green">{currencyBRL(atual)}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        {!!a.rendimento && (
                          <div>
                            <div className="text-mist">Rendimento</div>
                            <div className="font-mono font-semibold text-indigo">{a.rendimento}% a.a.</div>
                          </div>
                        )}
                        {ganho !== 0 && (
                          <div>
                            <div className="text-mist">Ganho</div>
                            <div className={'font-mono font-semibold ' + (ganho >= 0 ? 'text-green' : 'text-red')}>
                              {ganho >= 0 ? '+' : ''}{currencyBRL(ganho)}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                }
                // Crypto/FIAT
                const brl = ativoValorBRL(a, cotacoes)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setAEditing(a); setAOpen(true) }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                    style={{ borderTop: '3px solid var(--color-indigo)' }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">{a.type || 'Ativo'}</div>
                    <div className="text-[15px] font-bold text-ink">{a.platform || '—'}</div>
                    <div className="mb-3 text-[11px] text-faint">
                      {(a.qty ?? 0).toLocaleString('pt-BR')} @ {a.unitPrice ?? 0} {a.currency ?? 'BRL'}
                    </div>
                    <div className="text-[11px] text-mist">Valor em BRL</div>
                    <div className="font-mono text-[20px] font-extrabold text-indigo">{currencyBRL(brl)}</div>
                    {a.updated && (
                      <div className="mt-1 text-[11px] text-faint">
                        Atualizado: {new Date(a.updated + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
      )}

      {/* Passivos */}
      {tab === 'passivos' && (
        passivos.length === 0
          ? <EmptyState label="Nenhum passivo cadastrado." onAdd={() => { setPEditing(null); setPOpen(true) }} />
          : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {passivos.map((p) => {
                const valor = p.valorAcordado || p.valorProposta || p.valorOriginal || 0
                const status = (p.status ?? 'pendente') as string
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPEditing(p); setPOpen(true) }}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-elevated/40"
                    style={{ borderTop: '3px solid var(--color-red)' }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                      {(p.tipo as string) ?? '—'}{p.credor ? ` · ${p.credor}` : ''}
                    </div>
                    <div className="text-[15px] font-bold text-ink">{p.desc}</div>
                    <div className={'mb-3 text-[11px] font-semibold ' + (STATUS_COLOR[status] ?? 'text-mist')}>
                      {STATUS_LABEL[status] ?? status}
                    </div>
                    <div className="text-[11px] text-mist">Valor devido</div>
                    <div className={'font-mono text-[20px] font-extrabold ' + (status === 'quitado' ? 'text-mist line-through' : 'text-red')}>
                      {currencyBRL(valor)}
                    </div>
                    {p.valorOriginal && p.valorAcordado && p.valorAcordado < p.valorOriginal && (
                      <div className="mt-1 text-[11px] text-mist">
                        Original <span className="font-mono">{currencyBRL(p.valorOriginal)}</span>
                        <span className="text-green"> · -{currencyBRL(p.valorOriginal - p.valorAcordado)}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
      )}

      {/* Modais */}
      <EquipamentoModal open={eqOpen} onClose={() => setEqOpen(false)} editing={eqEditing} />
      <VeiculoModal open={vOpen} onClose={() => setVOpen(false)} editing={vEditing} />
      <ImovelModal open={imOpen} onClose={() => setImOpen(false)} editing={imEditing} />
      <AtivoModal open={aOpen} onClose={() => setAOpen(false)} editing={aEditing} />
      <PassivoModal open={pOpen} onClose={() => setPOpen(false)} editing={pEditing} />
    </div>
  )
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center">
      <p className="text-sm text-mist">{label}</p>
      <Button onClick={onAdd} className="mt-4" size="sm">
        <Plus size={14} /> Adicionar
      </Button>
    </div>
  )
}
