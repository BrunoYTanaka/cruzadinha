import type { SourceRow } from '@cruzadinha/shared'
import type { Executor } from '../../platform/db/client'
import {
  sourceSettingChanges,
  sourceSettings,
  type SourceSettingSnapshot,
} from '../../platform/db/schema'
import type { SourceSetting } from './sources.rules'

export async function listSourceRows(db: Executor): Promise<SourceRow[]> {
  return db
    .select({
      id: sourceSettings.sourceId,
      visible: sourceSettings.visible,
      position: sourceSettings.position,
    })
    .from(sourceSettings)
}

// Troca de posições viola o índice único no meio de um UPDATE; apaga e reinsere (4 linhas).
export async function replaceSourceRows(
  tx: Executor,
  rows: readonly SourceSetting[],
): Promise<void> {
  await tx.delete(sourceSettings)
  await tx
    .insert(sourceSettings)
    .values(rows.map((row) => ({ sourceId: row.id, visible: row.visible, position: row.position })))
}

export async function insertChange(
  tx: Executor,
  change: { userId: string; before: SourceSettingSnapshot; after: SourceSettingSnapshot },
): Promise<void> {
  await tx.insert(sourceSettingChanges).values(change)
}
