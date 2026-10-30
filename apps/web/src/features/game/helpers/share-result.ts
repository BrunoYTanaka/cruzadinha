import { puzzleSourceNames, type PuzzleSourceId } from '@cruzadinha/shared'
import { formatElapsed } from '../../../shared/helpers/time/time'

// Só fonte, data e tempo entram aqui: a função não recebe solução, dicas nem células, então o
// texto não tem como revelar uma resposta (feature 052).
export function buildShareText(result: {
  source: PuzzleSourceId
  date: string
  elapsedMs: number
}): string {
  const [year, month, day] = result.date.split('-')
  return [
    `Cruzadinha · ${puzzleSourceNames[result.source]} · ${day}/${month}/${year}`,
    `Concluí em ${formatElapsed(result.elapsedMs)}`,
  ].join('\n')
}
