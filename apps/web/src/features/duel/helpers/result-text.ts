import type { DuelResult, DuelStatus } from '@cruzadinha/shared'
import { timeText } from './rules-text'

export function headline(result: DuelResult): string {
  if (result.verdict === 'tie') return 'Empate!'
  return result.verdict === 'won' ? 'Você venceu!' : 'Você perdeu.'
}

export function reasonText(result: DuelResult): string {
  switch (result.reason) {
    case 'time':
      return result.diffMs === null || result.diffMs === 0
        ? 'Os dois fizeram o mesmo tempo.'
        : `Diferença de ${timeText(result.diffMs)}.`
    case 'forfeit':
      return result.verdict === 'won' ? 'O oponente desistiu.' : 'Você desistiu.'
    case 'timeout':
      return result.verdict === 'won'
        ? 'O tempo do oponente esgotou.'
        : 'Seu tempo esgotou: passou do tempo máximo.'
    case 'walkover':
      return result.verdict === 'won'
        ? 'O prazo venceu e o oponente não terminou (W.O.).'
        : 'O prazo venceu e você não terminou (W.O.).'
    case 'declined':
      return 'O desafio foi recusado.'
  }
}

export const endedText: Partial<Record<DuelStatus, string>> = {
  cancelled: 'Este x1 foi cancelado.',
  expired: 'O prazo deste x1 venceu sem resultado.',
}
