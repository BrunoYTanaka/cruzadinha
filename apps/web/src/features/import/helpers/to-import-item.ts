import { importItemSchema, type ImportItem } from '@cruzadinha/shared'
import type { GuestProgress } from '../../../domain/guest/guest-progress'

// Só o que a conta guarda: sem ajudas, geração do jogo nem versão do registro. Um registro que o
// contrato recusa (por exemplo, concluído sem tempo) devolve `null` e fica no aparelho.
export function toImportItem(record: GuestProgress): ImportItem | null {
  const parsed = importItemSchema.safeParse({
    puzzleId: record.puzzleId,
    cells: record.cells,
    elapsedMs: record.elapsedMs,
    status: record.status,
    savedAt: record.savedAt,
    completedAt: record.completedAt,
    finishedMs: record.finishedMs,
    bestMs: record.bestMs,
    bestAt: record.bestAt,
  })
  return parsed.success ? parsed.data : null
}
