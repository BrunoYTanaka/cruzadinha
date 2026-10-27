import {
  progressSchema,
  puzzleResponseSchema,
  type Progress,
  type PuzzleResponse,
  type PuzzleSourceId,
} from '@cruzadinha/shared'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { guestStore } from '../../../guest'
import { listOutboxes } from '../outbox/outbox'

export const OFFLINE_DB_NAME = 'cruzadinha-offline'
export const OFFLINE_PUZZLE_LIMIT = 60

type PuzzleRecord = {
  puzzleId: string
  response: unknown
  source: PuzzleSourceId
  date: string
  openedAt: number
}

// Tudo o que sai do banco é `unknown` e passa pelos schemas de `shared` antes de ser usado.
interface OfflineDB extends DBSchema {
  puzzles: { key: string; value: PuzzleRecord; indexes: { 'by-openedAt': number } }
  'known-progress': {
    key: [string, string]
    value: { userId: string; puzzleId: string; progress: unknown }
  }
}

export type StoredPuzzle = {
  puzzleId: string
  source: PuzzleSourceId
  date: string
  title: string | null
}

let opened: Promise<IDBPDatabase<OfflineDB>> | null = null
let openedWith: IDBFactory | undefined
let persistAsked = false
const listeners = new Set<() => void>()

// Reabre sozinho quando o `indexedDB` global muda (na prática, só nos testes).
function database(): Promise<IDBPDatabase<OfflineDB>> {
  if (!opened || openedWith !== globalThis.indexedDB) {
    openedWith = globalThis.indexedDB
    persistAsked = false
    opened = (async () =>
      openDB<OfflineDB>(OFFLINE_DB_NAME, 1, {
        upgrade(db) {
          db.createObjectStore('puzzles', { keyPath: 'puzzleId' }).createIndex(
            'by-openedAt',
            'openedAt',
          )
          db.createObjectStore('known-progress', { keyPath: ['userId', 'puzzleId'] })
        },
      }))()
  }
  return opened
}

// A cópia local nunca derruba o jogo: qualquer falha de armazenamento vira "não há cópia".
async function safely<T>(
  fallback: T,
  work: (db: IDBPDatabase<OfflineDB>) => Promise<T>,
): Promise<T> {
  try {
    return await work(await database())
  } catch {
    return fallback
  }
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeOfflineStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function parseResponse(value: unknown): PuzzleResponse | null {
  const parsed = puzzleResponseSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

// Cruzadas que o limite nunca remove (FR-013): com envio pendente de qualquer conta, em andamento
// como visitante ou em andamento no progresso conhecido de uma conta.
async function protectedIds(db: IDBPDatabase<OfflineDB>): Promise<Set<string>> {
  const ids = new Set(listOutboxes().map((owner) => owner.puzzleId))
  for (const record of await guestStore.getAll()) {
    if (record.status === 'in_progress') ids.add(record.puzzleId)
  }
  for (const entry of await db.getAll('known-progress')) {
    const progress = progressSchema.safeParse(entry.progress)
    if (progress.success && progress.data.status === 'in_progress') ids.add(progress.data.puzzleId)
  }
  return ids
}

async function enforceLimit(db: IDBPDatabase<OfflineDB>, keep: string): Promise<void> {
  const total = await db.count('puzzles')
  if (total <= OFFLINE_PUZZLE_LIMIT) return
  const protectedSet = await protectedIds(db)
  protectedSet.add(keep)
  let excess = total - OFFLINE_PUZZLE_LIMIT
  for (const record of await db.getAllFromIndex('puzzles', 'by-openedAt')) {
    if (excess <= 0) break
    if (protectedSet.has(record.puzzleId)) continue
    await db.delete('puzzles', record.puzzleId)
    excess -= 1
  }
}

// Guarda a cruzada (ou atualiza `openedAt`). Devolve falso quando o navegador não deixou.
export async function savePuzzle(response: PuzzleResponse, now = Date.now()): Promise<boolean> {
  const saved = await safely(false, async (db) => {
    await db.put('puzzles', {
      puzzleId: response.puzzleId,
      response,
      source: response.puzzle.source,
      date: response.puzzle.date,
      openedAt: now,
    })
    await enforceLimit(db, response.puzzleId)
    return true
  })
  if (saved && !persistAsked) {
    persistAsked = true
    // O navegador pode recusar; sem aviso.
    void navigator.storage?.persist?.().catch(() => undefined)
  }
  if (saved) notify()
  return saved
}

// A cópia guardada; marca a abertura. Registro inválido é apagado e tratado como ausente.
export async function readPuzzle(
  puzzleId: string,
  now = Date.now(),
): Promise<PuzzleResponse | null> {
  return safely(null, async (db) => {
    const record = await db.get('puzzles', puzzleId)
    if (!record) return null
    const response = parseResponse(record.response)
    if (!response) {
      await db.delete('puzzles', puzzleId)
      return null
    }
    await db.put('puzzles', { ...record, openedAt: now })
    return response
  })
}

export async function listStoredPuzzles(): Promise<StoredPuzzle[]> {
  return safely([], async (db) => {
    const list: StoredPuzzle[] = []
    for (const record of await db.getAll('puzzles')) {
      const response = parseResponse(record.response)
      if (response) {
        list.push({
          puzzleId: record.puzzleId,
          source: record.source,
          date: record.date,
          title: response.puzzle.attribution.title,
        })
      }
    }
    return list
  })
}

export async function readKnownProgress(
  userId: string,
  puzzleId: string,
): Promise<Progress | null> {
  return safely(null, async (db) => {
    const entry = await db.get('known-progress', [userId, puzzleId])
    if (!entry) return null
    const progress = progressSchema.safeParse(entry.progress)
    if (progress.success) return progress.data
    await db.delete('known-progress', [userId, puzzleId])
    return null
  })
}

// Só para cruzadas guardadas (R6): sem cópia, o progresso conhecido não serviria de nada.
export async function writeKnownProgress(userId: string, progress: Progress): Promise<void> {
  await safely(undefined, async (db) => {
    if (!(await db.get('puzzles', progress.puzzleId))) return
    await db.put('known-progress', { userId, puzzleId: progress.puzzleId, progress })
  })
}

// Apaga o progresso conhecido de `userId`; com `except`, o de todas as outras contas.
export async function clearKnownProgress(
  userId: string,
  options: { except?: boolean } = {},
): Promise<void> {
  await safely(undefined, async (db) => {
    const tx = db.transaction('known-progress', 'readwrite')
    for (const entry of await tx.store.getAll()) {
      if ((entry.userId === userId) !== (options.except ?? false)) {
        await tx.store.delete([entry.userId, entry.puzzleId])
      }
    }
    await tx.done
  })
}
