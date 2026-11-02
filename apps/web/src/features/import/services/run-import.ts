import { MAX_IMPORT_ITEMS, type ImportItem } from '@cruzadinha/shared'
import type { GuestProgress } from '../../../domain/guest/guest-progress'
import { importProgress } from '../../../shared/services/api/progress/progress'
import { ApiRequestError } from '../../../shared/services/api/client/client'
import { guestStore } from '../../guest'
import { clearDraft } from '../../offline'
import { toImportItem } from '../helpers/to-import-item'

export type ImportSummary = { imported: number; kept: number; rejected: number }

type Options = { sleep?: (ms: number) => Promise<void> }

const MAX_WAIT_SECONDS = 60
const MAX_ATTEMPTS = 5
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Envia o progresso de visitante em lotes. O registro local só some depois que a conta respondeu
// `imported` ou `kept` para ele e se ele não mudou desde a leitura; qualquer erro sobe sem apagar
// o lote em curso (feature 057, FR-009 e FR-010).
export async function runImport(
  records: GuestProgress[],
  { sleep = defaultSleep }: Options = {},
): Promise<ImportSummary> {
  const summary: ImportSummary = { imported: 0, kept: 0, rejected: 0 }
  const sendable: { item: ImportItem; record: GuestProgress }[] = []
  for (const record of records) {
    const item = toImportItem(record)
    if (item) sendable.push({ item, record })
    else summary.rejected += 1
  }

  for (let start = 0; start < sendable.length; start += MAX_IMPORT_ITEMS) {
    const batch = sendable.slice(start, start + MAX_IMPORT_ITEMS)
    const response = await send(
      batch.map((entry) => entry.item),
      sleep,
    )
    summary.imported += response.imported
    summary.kept += response.kept
    summary.rejected += response.rejected
    for (const outcome of response.results) {
      if (outcome.result === 'rejected') continue
      const sent = batch.find((entry) => entry.record.puzzleId === outcome.puzzleId)
      if (!sent) continue
      if (await guestStore.removeIfUnchanged(sent.record.puzzleId, sent.record.savedAt)) {
        clearDraft('guest', sent.record.puzzleId)
      }
    }
  }
  return summary
}

async function send(items: ImportItem[], sleep: (ms: number) => Promise<void>) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await importProgress(items)
    } catch (error) {
      const wait = error instanceof ApiRequestError && error.status === 429
      if (!wait || attempt >= MAX_ATTEMPTS) throw error
      await sleep(Math.min(error.retryAfterSeconds ?? 1, MAX_WAIT_SECONDS) * 1000)
    }
  }
}
