import type { Puzzle, Solution } from '@cruzadinha/shared'
import { agilmenteResponseSchema } from '../sources/oglobo/agilmente-schema'
import { convertAgilmenteResponse } from '../sources/oglobo/convert'
import dailyValid from '../sources/oglobo/fixtures/daily-valid.json'

const SAMPLE_LABEL = 'Exemplo de desenvolvimento (seed)'

// Puzzle de exemplo do seed: a fixture 5 x 5 de texto inventado, passada pelo mesmo conversor e
// pela mesma validação de qualquer puzzle. Só o seed importa este arquivo (fora do bundle).
// A atribuição deixa claro que é exemplo, para o conteúdo inventado não parecer da fonte real.
export function buildSamplePuzzle(date: string): { puzzle: Puzzle; solution: Solution } {
  const converted = convertAgilmenteResponse(
    agilmenteResponseSchema.parse(dailyValid),
    'daily',
    date,
  )
  if (!converted.ok) throw new Error('a fixture do puzzle de exemplo deveria converter')
  const puzzle: Puzzle = {
    ...converted.puzzle,
    attribution: { sourceName: SAMPLE_LABEL, title: SAMPLE_LABEL, author: null, copyright: null },
  }
  return { puzzle, solution: converted.solution }
}
