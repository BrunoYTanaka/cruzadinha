import { afterEach, describe, expect, it, vi } from 'vitest'
import { guestStore } from '../../guest'
import { saveDraft, loadDraft } from '../../offline'
import { apiError, jsonResponse, mockApi } from '../../../test/http'
import { runImport } from './run-import'

const A = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const B = '5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b'
const savedAt = new Date().toISOString()

const save = (puzzleId: string, overrides = {}) =>
  guestStore.save({
    puzzleId,
    date: '2026-10-16',
    cells: [['A', null]],
    elapsedMs: 5_000,
    status: 'in_progress',
    savedAt,
    help: null,
    ...overrides,
  })

const outcome = (puzzleId: string, result: string) => ({ puzzleId, result })
const reply = (results: { puzzleId: string; result: string }[]) =>
  jsonResponse(200, {
    results,
    imported: results.filter((r) => r.result === 'imported').length,
    kept: results.filter((r) => r.result === 'kept').length,
    rejected: results.filter((r) => r.result === 'rejected').length,
  })

afterEach(() => vi.unstubAllGlobals())

describe('runImport', () => {
  it('envia sem ajudas, apaga o local e o rascunho do que a conta confirmou', async () => {
    await save(A, { help: { usage: { letters: 1, words: 0 }, marks: {}, locked: [] } })
    saveDraft('guest', A, [['B', null]])
    const api = mockApi({ 'POST /api/progress/import': () => reply([outcome(A, 'imported')]) })

    const summary = await runImport(await guestStore.getAll())

    expect(summary).toEqual({ imported: 1, kept: 0, rejected: 0 })
    expect(JSON.stringify(api.calls[0]?.body)).not.toContain('help')
    expect(await guestStore.getAll()).toEqual([])
    expect(loadDraft('guest', A)).toBeNull()
  })

  it('mantém no aparelho o que a conta recusou e apaga o que ela já cobria', async () => {
    await save(A)
    await save(B)
    mockApi({
      'POST /api/progress/import': () => reply([outcome(A, 'kept'), outcome(B, 'rejected')]),
    })

    const summary = await runImport(await guestStore.getAll())

    expect(summary).toEqual({ imported: 0, kept: 1, rejected: 1 })
    expect((await guestStore.getAll()).map((r) => r.puzzleId)).toEqual([B])
  })

  it('mantém tudo quando a rede falha', async () => {
    await save(A)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))

    await expect(runImport(await guestStore.getAll())).rejects.toBeTruthy()
    expect(await guestStore.getAll()).toHaveLength(1)
  })

  it('mantém o registro que mudou durante o envio', async () => {
    await save(A)
    const records = await guestStore.getAll()
    mockApi({
      'POST /api/progress/import': async () => {
        await save(A, { savedAt: new Date(Date.now() + 60_000).toISOString(), elapsedMs: 9_000 })
        return reply([outcome(A, 'imported')])
      },
    })

    await runImport(records)
    expect(await guestStore.getAll()).toMatchObject([{ elapsedMs: 9_000 }])
  })

  it('espera o Retry-After num 429 e repete o lote', async () => {
    await save(A)
    let calls = 0
    mockApi({
      'POST /api/progress/import': () => {
        calls += 1
        return calls === 1
          ? apiError(429, 'too-many-attempts', {})
          : reply([outcome(A, 'imported')])
      },
    })
    const sleep = vi.fn().mockResolvedValue(undefined)

    const summary = await runImport(await guestStore.getAll(), { sleep })

    expect(summary.imported).toBe(1)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('mantém tudo quando a sessão acaba no meio (401)', async () => {
    await save(A)
    mockApi({ 'POST /api/progress/import': () => apiError(401, 'unauthenticated', {}) })

    await expect(runImport(await guestStore.getAll())).rejects.toBeTruthy()
    expect(await guestStore.getAll()).toHaveLength(1)
  })

  it('manda 1.464 itens em 15 lotes de no máximo 100', async () => {
    const base = await save(A)
    if (!base) throw new Error('save')
    const records = Array.from({ length: 1464 }, (_, i) => ({
      ...base,
      puzzleId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    }))
    const api = mockApi({ 'POST /api/progress/import': () => reply([]) })

    await runImport(records)

    const sizes = api.calls.map((call) => (call.body as { items: unknown[] }).items.length)
    expect(sizes).toHaveLength(15)
    expect(Math.max(...sizes)).toBe(100)
  })
})
