// Registry de fluxos guiados disponíveis no Simulador.
// Adicionar novos fluxos exportando o FluxoSpec daqui.
import { FLUXO_RESERVA } from './reserva'
import { FLUXO_APOSENTADORIA } from './aposentadoria'
import { FLUXO_VEICULO } from './veiculo'
import { FLUXO_RENDA_FIXA } from './renda-fixa'
import type { FluxoSpec } from '../sim-fluxo'

export const FLUXOS: FluxoSpec[] = [
  FLUXO_RESERVA,
  FLUXO_APOSENTADORIA,
  FLUXO_VEICULO,
  FLUXO_RENDA_FIXA,
]

export function fluxoById(id: string): FluxoSpec | undefined {
  return FLUXOS.find((f) => f.id === id)
}

export { FLUXO_RESERVA, FLUXO_APOSENTADORIA, FLUXO_VEICULO, FLUXO_RENDA_FIXA }
