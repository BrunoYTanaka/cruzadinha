import {
  generatedSourceIds,
  GENERATION_DAILY_CALLS,
  parseDifficultyTitle,
  isGeneratedSource,
  puzzleSourceIdSchema,
  type DiscardGeneratedRequest,
  type GeneratedSettingsRequest,
  type GeneratedSourceId,
  type GeneratedSourceView,
  resolveVisibleSources,
  type AdminSource,
  type PuzzleSourceId,
  type SourceRow,
  type UpdateSourcesRequest,
} from '@cruzadinha/shared'
import type { Database } from '../../platform/db/client'
import { systemClock, type Clock } from '../../platform/lib/clock'
import { todayInSaoPaulo } from '../../platform/lib/dates'
import { createRateLimitRepository } from '../../platform/rate-limit'
import { answersOf, deleteTodayIfUnused, findToday } from '../puzzles'
import { GENERATION_CALLS_WINDOW, generationCallKey } from './generation'
import type { SourceSettingSnapshot } from '../../platform/db/schema'
import {
  insertChange,
  listSourceRows,
  readGeneratedSettings,
  replaceSourceRows,
  upsertGeneratedSettings,
} from './sources.repository'
import { decideSources, type SourceSetting } from './sources.rules'

export type SaveSourcesResult =
  { ok: true; sources: AdminSource[] } | { ok: false; reason: 'invalid' | 'no-visible-source' }

// Todas as fontes do código, gravadas ou não, em ordem: sem linha vale visível depois das gravadas,
// exceto fonte gerada, que nasce escondida (feature 064), como em `resolveVisibleSources`.
function toAdminList(rows: readonly SourceRow[]): AdminSource[] {
  const known = rows.flatMap((row) => {
    const id = puzzleSourceIdSchema.safeParse(row.id)
    return id.success ? [{ id: id.data, visible: row.visible, position: row.position }] : []
  })
  known.sort((a, b) => a.position - b.position)
  const saved = new Set(known.map((row) => row.id))
  const missing = puzzleSourceIdSchema.options.filter((id) => !saved.has(id))
  const appended = missing.map((id) => ({ id, visible: !isGeneratedSource(id), position: 0 }))
  return [...known, ...appended].map((row, position) => ({ ...row, position }))
}

const snapshot = (rows: readonly SourceSetting[]): SourceSettingSnapshot =>
  rows.map((row) => ({ sourceId: row.id, visible: row.visible, position: row.position }))

export type SourcesService = ReturnType<typeof createSourcesService>

export type DiscardResult = 'deleted' | 'not-found' | 'in-use'

export function createSourcesService(deps: { db: Database; clock?: Clock }) {
  const { db } = deps
  const clock = deps.clock ?? systemClock
  const attempts = createRateLimitRepository(db)

  // Feature 064 (FR-024): configuração, chamadas restantes e a cruzada de hoje de uma fonte gerada.
  async function generatedView(source: GeneratedSourceId): Promise<GeneratedSourceView> {
    const today = todayInSaoPaulo(clock)
    const settings = await readGeneratedSettings(db, source)
    const windowStart = new Date(clock().getTime() - GENERATION_CALLS_WINDOW.windowMinutes * 60_000)
    const { count } = await attempts.countSince(generationCallKey(source, today), windowStart)
    const stored = await findToday(db, { source, date: today })
    const answers = stored ? answersOf(stored) : []
    return {
      source,
      ...settings,
      callsLeft: Math.max(0, GENERATION_DAILY_CALLS - count),
      today: stored
        ? {
            puzzleId: stored.puzzleId,
            size: stored.puzzle.grid.width,
            discardable: stored.blockedBy === null,
            blockedBy: stored.blockedBy,
            difficulty: parseDifficultyTitle(stored.puzzle.attribution.title),
            words: stored.puzzle.words.map((word, i) => ({
              number: word.number,
              direction: word.direction,
              answer: answers[i] ?? '',
              clue: word.clue,
            })),
          }
        : null,
    }
  }

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

    async listGenerated(): Promise<GeneratedSourceView[]> {
      return Promise.all(generatedSourceIds.map(generatedView))
    },

    // Vale a partir da próxima geração; cruzadas salvas não mudam (FR-020).
    async saveGenerated(request: GeneratedSettingsRequest): Promise<GeneratedSourceView> {
      await upsertGeneratedSettings(db, request)
      return generatedView(request.source)
    },

    // Só a cruzada de hoje, sem progresso de conta nem x1 (FR-025). Não devolve chamadas ao limite.
    async discardGenerated(request: DiscardGeneratedRequest): Promise<DiscardResult> {
      return deleteTodayIfUnused(db, {
        source: request.source,
        date: todayInSaoPaulo(clock),
        puzzleId: request.puzzleId,
      })
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
