import {
  GENERATED_SETTINGS_DEFAULT,
  type GeneratedSettings,
  type GeneratedSourceId,
  type SourceRow,
} from '@cruzadinha/shared'
import { eq, sql } from 'drizzle-orm'
import type { Executor } from '../../platform/db/client'
import {
  generatedSourceSettings,
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

// Feature 064: tamanho e dificuldade de uma fonte gerada; sem linha, o padrão (11, medium).
export async function readGeneratedSettings(
  db: Executor,
  source: GeneratedSourceId,
): Promise<GeneratedSettings> {
  const [row] = await db
    .select({
      gridSize: generatedSourceSettings.gridSize,
      difficulty: generatedSourceSettings.difficulty,
    })
    .from(generatedSourceSettings)
    .where(eq(generatedSourceSettings.sourceId, source))
  return row ?? GENERATED_SETTINGS_DEFAULT
}

// Só o seed de desenvolvimento (feature 064, FR-028): mostra uma fonte, criando a linha no fim da
// ordem se ela não existir. O painel continua sendo o único caminho em produção.
export async function showSourceForDevelopment(db: Executor, source: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO source_settings (source_id, visible, position)
    SELECT ${source}, true, COALESCE(MAX(position), -1) + 1 FROM source_settings
    ON CONFLICT (source_id) DO UPDATE SET visible = true`)
}

export async function upsertGeneratedSettings(
  db: Executor,
  settings: GeneratedSettings & { source: GeneratedSourceId },
): Promise<void> {
  await db
    .insert(generatedSourceSettings)
    .values({
      sourceId: settings.source,
      gridSize: settings.gridSize,
      difficulty: settings.difficulty,
    })
    .onConflictDoUpdate({
      target: generatedSourceSettings.sourceId,
      set: { gridSize: settings.gridSize, difficulty: settings.difficulty },
    })
}
