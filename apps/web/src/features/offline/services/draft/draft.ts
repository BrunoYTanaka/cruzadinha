import { z } from 'zod'
import {
  readStorage,
  removeStorage,
  writeStorage,
} from '../../../../shared/services/storage/storage'

const PREFIX = 'cruzadinha:draft:'
const letter = z.string().regex(/^[A-ZÇ]$/)
// Estrito: um valor de outra forma é ignorado e removido.
const draftSchema = z.strictObject({
  v: z.literal(1),
  cells: z.array(z.array(letter.nullable())),
})

export type DraftCells = (string | null)[][]

export function draftKey(owner: string, puzzleId: string): string {
  return `${PREFIX}${owner}:${puzzleId}`
}

// Rascunho nunca vai ao servidor: só fica neste aparelho, por dono (id da conta ou `guest`).
export function loadDraft(owner: string, puzzleId: string): DraftCells | null {
  const key = draftKey(owner, puzzleId)
  const raw = readStorage(key)
  if (raw === null) return null
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw) as unknown)
    if (parsed.success) return parsed.data.cells
  } catch {
    // JSON inválido cai na remoção abaixo
  }
  removeStorage(key)
  return null
}

// Rascunho todo vazio remove a chave.
export function saveDraft(owner: string, puzzleId: string, cells: DraftCells): void {
  if (cells.every((row) => row.every((value) => value === null))) {
    clearDraft(owner, puzzleId)
    return
  }
  writeStorage(draftKey(owner, puzzleId), JSON.stringify({ v: 1, cells }))
}

export function clearDraft(owner: string, puzzleId: string): void {
  removeStorage(draftKey(owner, puzzleId))
}

// Cada chave `cruzadinha:draft:<dono>:<puzzleId>` do aparelho (ids sem `:`), de qualquer dono.
export function listDrafts(): { owner: string; puzzleId: string }[] {
  const drafts: { owner: string; puzzleId: string }[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      const [owner, puzzleId] = key.slice(PREFIX.length).split(':')
      if (owner && puzzleId) drafts.push({ owner, puzzleId })
    }
  } catch {
    // sem localStorage, nada a listar
  }
  return drafts
}
