import { saveProgressRequestSchema, type SaveProgressRequest } from '@cruzadinha/shared'
import { z } from 'zod'
import {
  readStorage,
  removeStorage,
  writeStorage,
} from '../../../../shared/services/storage/storage'

// Gravações ainda não confirmadas de uma conta e cruzada, no aparelho (features 008, 013 e 041).
// Até dois itens, em ordem: `[reset, save]`. Um `save` sozinho continua no formato antigo (só o
// corpo), para uma aba com a versão anterior do site ainda ler.
export type OutboxItem = { kind: 'save'; body: SaveProgressRequest } | { kind: 'reset'; at: string }

export type OutboxEvent =
  | { type: 'save'; body: SaveProgressRequest }
  | { type: 'reset'; at: string }
  | { type: 'save-confirmed'; savedAt: string }
  | { type: 'reset-confirmed' }
  // O servidor já tem progresso mais novo que o reset: ele não pode apagá-lo.
  | { type: 'server-progress'; savedAt: string }

const PREFIX = 'cruzadinha:outbox:'

const itemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('save'), body: saveProgressRequestSchema }),
  z.object({ kind: z.literal('reset'), at: z.iso.datetime() }),
])
const entrySchema = z.object({ v: z.literal(2), items: z.array(itemSchema).min(1).max(2) })

export function outboxKey(userId: string, puzzleId: string): string {
  return `${PREFIX}${userId}:${puzzleId}`
}

// Pura: o próximo estado da fila a cada evento (data-model §3).
export function decideOutbox(items: OutboxItem[], event: OutboxEvent): OutboxItem[] {
  switch (event.type) {
    case 'save': {
      const save: OutboxItem = { kind: 'save', body: event.body }
      return items[0]?.kind === 'reset' ? [items[0], save] : [save]
    }
    case 'reset':
      return [{ kind: 'reset', at: event.at }]
    case 'save-confirmed':
      return items.filter((item) => item.kind !== 'save' || item.body.savedAt > event.savedAt)
    case 'reset-confirmed':
      return items[0]?.kind === 'reset' ? items.slice(1) : items
    case 'server-progress':
      return items.filter((item) => item.kind !== 'reset' || item.at >= event.savedAt)
  }
}

function parseEntry(raw: string): OutboxItem[] {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  const entry = entrySchema.safeParse(value)
  if (entry.success) return entry.data.items
  const legacy = saveProgressRequestSchema.safeParse(value)
  return legacy.success ? [{ kind: 'save', body: legacy.data }] : []
}

export function readOutboxItems(userId: string, puzzleId: string): OutboxItem[] {
  const raw = readStorage(outboxKey(userId, puzzleId))
  return raw === null ? [] : parseEntry(raw)
}

export function writeOutboxItems(userId: string, puzzleId: string, items: OutboxItem[]): void {
  const key = outboxKey(userId, puzzleId)
  const only = items[0]
  if (!only) removeStorage(key)
  else if (items.length === 1 && only.kind === 'save') writeStorage(key, JSON.stringify(only.body))
  else writeStorage(key, JSON.stringify({ v: 2, items }))
}

// Lê, decide e grava; devolve o que ficou.
export function applyOutboxEvent(
  userId: string,
  puzzleId: string,
  event: OutboxEvent,
): OutboxItem[] {
  const next = decideOutbox(readOutboxItems(userId, puzzleId), event)
  writeOutboxItems(userId, puzzleId, next)
  return next
}

// O `save` mais novo da fila, para montar o tabuleiro ao abrir.
export function readOutbox(userId: string, puzzleId: string): SaveProgressRequest | null {
  const save = readOutboxItems(userId, puzzleId).find((item) => item.kind === 'save')
  return save?.kind === 'save' ? save.body : null
}

export type OutboxOwner = { userId: string; puzzleId: string }

// Cada chave `cruzadinha:outbox:<userId>:<puzzleId>` do aparelho (ids sem `:`), de qualquer conta.
export function listOutboxes(): OutboxOwner[] {
  const owners: OutboxOwner[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      const [userId, puzzleId] = key.slice(PREFIX.length).split(':')
      if (userId && puzzleId && readOutboxItems(userId, puzzleId).length > 0)
        owners.push({ userId, puzzleId })
    }
  } catch {
    // sem localStorage, nada a listar
  }
  return owners
}

export function clearOutbox(userId: string, puzzleId: string): void {
  removeStorage(outboxKey(userId, puzzleId))
}
