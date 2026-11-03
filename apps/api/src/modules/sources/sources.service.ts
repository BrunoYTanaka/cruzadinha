import {
  puzzleSourceIdSchema,
  resolveVisibleSources,
  type AdminSource,
  type PuzzleSourceId,
  type SourceRow,
  type UpdateSourcesRequest,
} from '@cruzadinha/shared'
import type { Database } from '../../platform/db/client'
import type { SourceSettingSnapshot } from '../../platform/db/schema'
import { insertChange, listSourceRows, replaceSourceRows } from './sources.repository'
import { decideSources, type SourceSetting } from './sources.rules'

export type SaveSourcesResult =
  { ok: true; sources: AdminSource[] } | { ok: false; reason: 'invalid' | 'no-visible-source' }

// Todas as fontes do código, gravadas ou não, em ordem: sem linha vale visível depois das gravadas.
function toAdminList(rows: readonly SourceRow[]): AdminSource[] {
  const known = rows.flatMap((row) => {
    const id = puzzleSourceIdSchema.safeParse(row.id)
    return id.success ? [{ id: id.data, visible: row.visible, position: row.position }] : []
  })
  known.sort((a, b) => a.position - b.position)
  const saved = new Set(known.map((row) => row.id))
  const missing = puzzleSourceIdSchema.options.filter((id) => !saved.has(id))
  return [...known, ...missing.map((id) => ({ id, visible: true, position: 0 }))].map(
    (row, position) => ({ ...row, position }),
  )
}

const snapshot = (rows: readonly SourceSetting[]): SourceSettingSnapshot =>
  rows.map((row) => ({ sourceId: row.id, visible: row.visible, position: row.position }))

export type SourcesService = ReturnType<typeof createSourcesService>

export function createSourcesService(deps: { db: Database }) {
  const { db } = deps
  const listVisible = async (): Promise<PuzzleSourceId[]> =>
    resolveVisibleSources(await listSourceRows(db))
  return {
    listVisible,

    async isVisible(source: PuzzleSourceId): Promise<boolean> {
      return (await listVisible()).includes(source)
    },

    async listAll(): Promise<AdminSource[]> {
      return toAdminList(await listSourceRows(db))
    },

    // Uma transação: substitui as linhas e grava o registro só quando algo mudou. Duas
    // alterações ao mesmo tempo: a última a confirmar vale, sem erro.
    async save(userId: string, request: UpdateSourcesRequest): Promise<SaveSourcesResult> {
      return db.transaction(async (tx) => {
        const current = toAdminList(await listSourceRows(tx))
        const decision = decideSources(current, request.sources)
        if (decision.kind === 'invalid') return { ok: false, reason: 'invalid' }
        if (decision.kind === 'no-visible-source') return { ok: false, reason: 'no-visible-source' }
        if (decision.kind === 'save') {
          await replaceSourceRows(tx, decision.rows)
          await insertChange(tx, {
            userId,
            before: snapshot(current),
            after: snapshot(decision.rows),
          })
        }
        return { ok: true, sources: toAdminList(await listSourceRows(tx)) }
      })
    },
  }
}
