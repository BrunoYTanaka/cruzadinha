import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { todayInBrasilia } from '../../../../shared/helpers/dates/dates'
import { getPuzzleByDate } from '../../../../shared/services/api/puzzles/puzzles'
import { savePuzzle } from '../offline-store/offline-store'

export type DownloadSummary = {
  saved: number
  failed: PuzzleSourceId[]
  // O navegador não deixou guardar (sem espaço ou armazenamento bloqueado).
  storageFailed: boolean
}

// Baixa a cruzada de hoje de cada fonte para jogar sem rede; uma fonte que falha não para as outras
// (feature 041, FR-014).
export async function downloadToday(today = todayInBrasilia()): Promise<DownloadSummary> {
  const sources = puzzleSourceIdSchema.options
  const results = await Promise.allSettled(sources.map((source) => getPuzzleByDate(source, today)))
  const summary: DownloadSummary = { saved: 0, failed: [], storageFailed: false }
  for (const [index, result] of results.entries()) {
    const source = sources[index]
    if (!source) continue
    if (result.status === 'rejected') {
      summary.failed.push(source)
    } else if (await savePuzzle(result.value)) {
      summary.saved += 1
    } else {
      summary.storageFailed = true
    }
  }
  return summary
}
