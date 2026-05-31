// Registry de fluxos guiados disponíveis no Simulador.
// Adicionar novos fluxos exportando o FluxoSpec daqui.
import { FLUXO_RESERVA } from './reserva'
import type { FluxoSpec } from '../sim-fluxo'

export const FLUXOS: FluxoSpec[] = [
  FLUXO_RESERVA,
  // FLUXO_APOSENTADORIA — fase 2
  // FLUXO_VEICULO_COMPRAR_OU_ALUGAR — fase 2
  // FLUXO_COMPARAR_RENDA_FIXA — fase 2
]

export function fluxoById(id: string): FluxoSpec | undefined {
  return FLUXOS.find((f) => f.id === id)
}

export { FLUXO_RESERVA }
