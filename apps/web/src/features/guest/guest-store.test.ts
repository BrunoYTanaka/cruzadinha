import { openDB } from 'idb'
import { describe, expect, it } from 'vitest'
import type { GuestSave } from '../../game-logic/guest-progress'
import { makePuzzle } from '../../test/fixtures'
import { createGuestStore, GUEST_DB_NAME } from './guest-store'

const PUZZLE_ID = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const OTHER_ID = '5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b'
const base = new Date('2026-10-16T12:00:00.000Z')
const at = (seconds: number) => new Date(base.getTime() + seconds * 1000).toISOString()
const grid = makePuzzle(['AB', 'CD']).grid

function save(overrides: Partial<GuestSave> = {}): GuestSave {
  return {
    puzzleId: PUZZLE_ID,
    date: '2026-10-16',
    cells: [
      ['A', null],
      [null, null],
    ],
    elapsedMs: 5_000,
    status: 'in_progress',
    savedAt: at(0),
    help: null,
    ...overrides,
  }
}

const store = () => createGuestStore({ now: () => base })

// Escreve direto no banco, como uma versão antiga do site (ou dado corrompido) faria.
async function writeRaw(value: unknown) {
  const db = await openDB(GUEST_DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('progress', { keyPath: 'puzzleId' })
    },
  })
  await db.put('progress', value)
  db.close()
}

describe('guest-store', () => {
  it('grava e lê de volta o registro', async () => {
    const guest = store()
    await guest.save(save())
    expect(await guest.get(PUZZLE_ID)).toMatchObject({
      v: 1,
      puzzleId: PUZZLE_ID,
      elapsedMs: 5_000,
    })
    expect(await guest.get(OTHER_ID)).toBeNull()
    expect(guest.isAvailable()).toBe(true)
  })

  it('sobrevive a outra instância (outra aba, ou a página reaberta)', async () => {
    await store().save(save())
    expect(await store().get(PUZZLE_ID)).toMatchObject({ elapsedMs: 5_000 })
  })

  it('com savedAt fora de ordem fica a gravação mais nova', async () => {
    const guest = store()
    await guest.save(save({ elapsedMs: 9_000, savedAt: at(10) }))
    await store().save(save({ elapsedMs: 4_000, savedAt: at(5) }))
    expect((await guest.get(PUZZLE_ID))?.elapsedMs).toBe(9_000)
  })

  it('gravações seguidas sem esperar ficam com a última', async () => {
    const guest = store()
    await Promise.all([
      guest.save(save({ elapsedMs: 1_000, savedAt: at(1) })),
      guest.save(save({ elapsedMs: 2_000, savedAt: at(2) })),
      guest.save(save({ elapsedMs: 3_000, savedAt: at(3) })),
    ])
    expect((await store().get(PUZZLE_ID))?.elapsedMs).toBe(3_000)
  })

  it('um registro inválido no banco é ignorado e apagado', async () => {
    await writeRaw({ puzzleId: PUZZLE_ID, v: 9, cells: 'quebrado' })
    const guest = store()
    expect(await guest.get(PUZZLE_ID)).toBeNull()
    expect(await guest.getAll()).toEqual([])
    await writeRaw({ puzzleId: OTHER_ID, v: 9 })
    await guest.get(OTHER_ID)
    const db = await openDB(GUEST_DB_NAME, 1)
    expect(await db.getAll('progress')).toEqual([])
    db.close()
  })

  it('um registro que não bate com a grade atual é descartado', async () => {
    const guest = store()
    await guest.save(save({ cells: [['A', null, null]] }))
    expect(await guest.getForPuzzle(PUZZLE_ID, grid)).toBeNull()
    expect(await guest.get(PUZZLE_ID)).toBeNull()

    await guest.save(save({ savedAt: at(1) }))
    expect(await guest.getForPuzzle(PUZZLE_ID, grid)).toMatchObject({ elapsedMs: 5_000 })
  })

  it('getAll devolve os registros válidos de todas as cruzadas', async () => {
    const guest = store()
    await guest.save(save())
    await guest.save(save({ puzzleId: OTHER_ID, status: 'completed', elapsedMs: 9_000 }))
    const all = await guest.getAll()
    expect(all.map((record) => [record.puzzleId, record.status]).sort()).toEqual(
      [
        [PUZZLE_ID, 'in_progress'],
        [OTHER_ID, 'completed'],
      ].sort(),
    )
  })

  it('reset mantém o recorde, e um salvamento posterior em andamento não reabre a concluída', async () => {
    const guest = store()
    await guest.save(save({ status: 'completed', elapsedMs: 412_000, savedAt: at(1) }))
    await guest.save(save({ savedAt: at(2) }))
    expect((await guest.get(PUZZLE_ID))?.status).toBe('completed')

    const reset = await guest.reset(PUZZLE_ID)
    expect(reset).toMatchObject({
      status: 'in_progress',
      elapsedMs: 0,
      finishedMs: null,
      bestMs: 412_000,
      cells: [
        [null, null],
        [null, null],
      ],
    })
    expect(await store().get(PUZZLE_ID)).toMatchObject({ status: 'in_progress', bestMs: 412_000 })
  })

  it('sem IndexedDB, fica indisponível e guarda só em memória', async () => {
    const guest = createGuestStore({ factory: () => undefined, now: () => base })
    const listener = { calls: 0 }
    guest.subscribe(() => listener.calls++)

    expect(await guest.save(save())).toMatchObject({ elapsedMs: 5_000 })
    expect(guest.isAvailable()).toBe(false)
    expect(listener.calls).toBe(1)
    expect(await guest.get(PUZZLE_ID)).toMatchObject({ elapsedMs: 5_000 })
    expect(await guest.getAll()).toHaveLength(1)
    expect(await store().get(PUZZLE_ID)).toBeNull()
  })

  it('com a abertura do banco falhando, também fica em memória', async () => {
    const broken = {
      open: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    } as unknown as IDBFactory
    const original = globalThis.indexedDB
    globalThis.indexedDB = broken
    try {
      const guest = createGuestStore({ now: () => base })
      expect(await guest.save(save())).toMatchObject({ elapsedMs: 5_000 })
      expect(guest.isAvailable()).toBe(false)
    } finally {
      globalThis.indexedDB = original
    }
  })
})
