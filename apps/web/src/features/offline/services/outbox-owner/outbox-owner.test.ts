import type { SaveProgressRequest } from '@cruzadinha/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeProgress, makePuzzleResponse, TINY } from '../../../../test/fixtures'
import { loadDraft, saveDraft } from '../draft/draft'
import { readKnownProgress, savePuzzle, writeKnownProgress } from '../offline-store/offline-store'
import { applyOutboxEvent, readOutboxItems } from '../outbox/outbox'
import {
  clearAccountData,
  discardOtherAccounts,
  dismissDiscardedNotice,
  hasAnyOutbox,
  hasDiscardedNotice,
  hasOutbox,
} from './outbox-owner'

const A = '3f1c9a52-1a2b-4c3d-8e4f-0123456789ab'
const B = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d'
const P = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const body: SaveProgressRequest = {
  cells: [['A', null]],
  elapsedMs: 1000,
  status: 'in_progress',
  savedAt: '2026-10-16T12:00:00.000Z',
}

beforeEach(async () => {
  localStorage.clear()
  await savePuzzle(makePuzzleResponse(TINY))
})

describe('dono das pendências', () => {
  it('sair apaga pendências e progresso conhecido da conta, e só dela', async () => {
    applyOutboxEvent(A, P, { type: 'save', body })
    applyOutboxEvent(B, P, { type: 'save', body })
    await writeKnownProgress(A, makeProgress())
    await writeKnownProgress(B, makeProgress())
    expect(hasOutbox(A)).toBe(true)
    await clearAccountData(A)
    expect(hasOutbox(A)).toBe(false)
    expect(readOutboxItems(B, P)).toHaveLength(1)
    expect(await readKnownProgress(A, P)).toBeNull()
    expect(await readKnownProgress(B, P)).not.toBeNull()
  })

  it('entrar com outra conta descarta a anterior e avisa uma vez', async () => {
    applyOutboxEvent(A, P, { type: 'save', body })
    await writeKnownProgress(A, makeProgress())
    await discardOtherAccounts(B)
    expect(hasAnyOutbox()).toBe(false)
    expect(await readKnownProgress(A, P)).toBeNull()
    expect(hasDiscardedNotice()).toBe(true)
    dismissDiscardedNotice()
    expect(hasDiscardedNotice()).toBe(false)
  })

  it('a mesma conta entrando de novo não perde nada nem avisa', async () => {
    applyOutboxEvent(A, P, { type: 'save', body })
    await discardOtherAccounts(A)
    expect(hasOutbox(A)).toBe(true)
    expect(hasDiscardedNotice()).toBe(false)
  })

  it('sair apaga os rascunhos da conta; entrar com outra apaga os das outras contas, não do visitante', async () => {
    const d = [['A', null]]
    saveDraft(A, P, d)
    saveDraft(B, P, d)
    saveDraft('guest', P, d)
    await clearAccountData(A)
    expect(loadDraft(A, P)).toBeNull()
    expect(loadDraft(B, P)).not.toBeNull()
    await discardOtherAccounts(A)
    expect(loadDraft(B, P)).toBeNull()
    expect(loadDraft('guest', P)).not.toBeNull()
  })
})
