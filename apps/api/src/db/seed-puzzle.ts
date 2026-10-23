import {
  puzzleSourceNames,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
} from '@cruzadinha/shared'
import { convertCrosswordCompiler } from '../sources/cruzadaonline/convert'
import { readFixture } from '../sources/cruzadaonline/fixtures'
import { readXml } from '../sources/cruzadaonline/xml'
import { convertCruzadasBrasil } from '../sources/cruzadasbrasil/convert'
import { readFixture as readBrasilFixture } from '../sources/cruzadasbrasil/fixtures'
import { readPageData } from '../sources/cruzadasbrasil/page-data'
import { agilmenteResponseSchema } from '../sources/oglobo/agilmente-schema'
import { convertAgilmenteResponse } from '../sources/oglobo/convert'
import dailyValid from '../sources/oglobo/fixtures/daily-valid.json'

const SAMPLE_LABEL = 'Exemplo de desenvolvimento (seed)'

function convertSample(source: PuzzleSourceId, date: string) {
  switch (source) {
    case 'oglobo':
      return convertAgilmenteResponse(agilmenteResponseSchema.parse(dailyValid), 'daily', date)
    case 'cruzadaonline': {
      const read = readXml(readFixture('daily-valid.xml'))
      if (!read.ok) throw new Error('a fixture do puzzle de exemplo deveria ser XML válido')
      return convertCrosswordCompiler(read.doc, 'daily', date)
    }
    case 'cruzadasbrasil': {
      const read = readPageData(readBrasilFixture('daily-valid.html'))
      if (!read.ok) throw new Error('a fixture do puzzle de exemplo deveria ter dados do jogo')
      // A fixture é de 2026-10-16; o conversor confere o id contra a data pedida.
      const data = { ...(read.data as Record<string, unknown>), id: date.replaceAll('-', '') }
      return convertCruzadasBrasil(data, 'daily', date)
    }
  }
}

// Puzzle de exemplo do seed, um por fonte: a fixture 5 x 5 de texto inventado de cada adaptador,
// passada pelo mesmo conversor e pela mesma validação de qualquer puzzle. Só o seed importa este
// arquivo (fora do bundle). A atribuição deixa claro que é exemplo, para o conteúdo inventado não
// parecer da fonte real; o título diz de qual fonte é o exemplo.
export function buildSamplePuzzle(
  source: PuzzleSourceId,
  date: string,
): { puzzle: Puzzle; solution: Solution } {
  const converted = convertSample(source, date)
  if (!converted.ok) throw new Error('a fixture do puzzle de exemplo deveria converter')
  const title = source === 'oglobo' ? SAMPLE_LABEL : `${SAMPLE_LABEL}: ${puzzleSourceNames[source]}`
  const puzzle: Puzzle = {
    ...converted.puzzle,
    attribution: { sourceName: SAMPLE_LABEL, title, author: null, copyright: null },
  }
  return { puzzle, solution: converted.solution }
}
