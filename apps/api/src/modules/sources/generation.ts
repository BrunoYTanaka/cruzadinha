import { GENERATION_DAILY_CALLS, type GeneratedSourceId } from '@cruzadinha/shared'

// Feature 064: chave do limite de chamadas ao modelo, por fonte gerada e por dia. A coleta reserva
// com ela e o painel conta com ela; a janela só precisa cobrir o dia, porque a chave traz a data.
export function generationCallKey(source: GeneratedSourceId, date: string) {
  return { action: 'PUZZLE_GENERATE', keyType: 'GLOBAL', keyValue: `${source}:${date}` } as const
}

export const GENERATION_CALLS_WINDOW = { max: GENERATION_DAILY_CALLS, windowMinutes: 24 * 60 }
