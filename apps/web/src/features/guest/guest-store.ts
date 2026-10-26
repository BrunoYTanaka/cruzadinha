import { cellsMatchGrid, type Puzzle } from '@cruzadinha/shared'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  decideGuestReset,
  decideGuestSave,
  type GuestProgress,
  type GuestSave,
} from '../../domain/guest/guest-progress'
import { guestProgressRecordSchema } from './guest-record'

export const GUEST_DB_NAME = 'cruzadinha-visitante'
const STORE = 'progress'

// O valor é `unknown`: tudo o que sai do banco passa pelo schema antes de ser usado.
interface GuestDB extends DBSchema {
  progress: { key: string; value: unknown }
}

export type GuestStore = {
  get(puzzleId: string): Promise<GuestProgress | null>
  // Só o registro que ainda bate com a grade atual; o que não bate é apagado.
  getForPuzzle(puzzleId: string, grid: Puzzle['grid']): Promise<GuestProgress | null>
  getAll(): Promise<GuestProgress[]>
  // Grava pela regra de `decideGuestSave` e devolve o registro que ficou.
  save(incoming: GuestSave): Promise<GuestProgress | null>
  // "Jogar de novo": zera e mantém o recorde.
  reset(puzzleId: string): Promise<GuestProgress | null>
  // Falso quando o navegador não deixou guardar: o progresso vale só nesta aba (FR-009).
  isAvailable(): boolean
  subscribe(listener: () => void): () => void
}

type Op = { kind: 'save'; item: GuestSave } | { kind: 'reset' }
type Slot = { ops: Op[]; running: Promise<void> | null }

function parse(value: unknown): GuestProgress | null {
  const parsed = guestProgressRecordSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function createGuestStore(
  options: { factory?: () => IDBFactory | undefined; now?: () => Date } = {},
): GuestStore {
  const factory = options.factory ?? (() => globalThis.indexedDB)
  const now = options.now ?? (() => new Date())

  // Abre uma vez por fábrica (os testes trocam a fábrica a cada teste). Depois de uma falha, o
  // resto da página usa o mapa em memória, que também guarda o último registro gravado.
  let opened: Promise<IDBPDatabase<GuestDB>> | null = null
  let lastFactory: IDBFactory | undefined | null = null
  let available = true
  const memory = new Map<string, GuestProgress>()
  const slots = new Map<string, Slot>()
  const listeners = new Set<() => void>()

  function fail() {
    if (!available) return
    available = false
    listeners.forEach((listener) => listener())
  }

  async function database(): Promise<IDBPDatabase<GuestDB> | null> {
    let current: IDBFactory | undefined
    try {
      current = factory()
    } catch {
      current = undefined
    }
    // Fábrica nova (na prática, só nos testes): começa de novo, sem a falha nem a memória da anterior.
    if (current !== lastFactory) {
      lastFactory = current
      opened = null
      memory.clear()
      if (!available) {
        available = true
        listeners.forEach((listener) => listener())
      }
    }
    if (!available) return null
    if (!current) {
      fail()
      return null
    }
    if (!opened) {
      // O `idb` usa o `indexedDB` global; a fábrica só decide se ele existe e quando reabrir.
      // Dentro de uma função assíncrona, para um `open` que lança na hora também virar falha tratada.
      opened = (async () =>
        openDB<GuestDB>(GUEST_DB_NAME, 1, {
          upgrade(db) {
            db.createObjectStore(STORE, { keyPath: 'puzzleId' })
          },
        }))()
    }
    try {
      return await opened
    } catch {
      fail()
      return null
    }
  }

  async function readOne(puzzleId: string): Promise<GuestProgress | null> {
    const db = await database()
    if (!db) return memory.get(puzzleId) ?? null
    try {
      const raw = await db.get(STORE, puzzleId)
      if (raw === undefined) return null
      const record = parse(raw)
      if (!record) await db.delete(STORE, puzzleId)
      return record
    } catch {
      fail()
      return memory.get(puzzleId) ?? null
    }
  }

  async function remove(puzzleId: string): Promise<void> {
    memory.delete(puzzleId)
    const db = await database()
    try {
      await db?.delete(STORE, puzzleId)
    } catch {
      fail()
    }
  }

  function applyInMemory(puzzleId: string, op: Op): GuestProgress | null {
    const current = memory.get(puzzleId) ?? null
    const next = decide(current, op)
    if (next) memory.set(puzzleId, next)
    return memory.get(puzzleId) ?? null
  }

  function decide(current: GuestProgress | null, op: Op): GuestProgress | null {
    if (op.kind === 'reset') return current ? decideGuestReset(current, now()) : null
    const decision = decideGuestSave(current, op.item, now())
    return decision.kind === 'apply' ? decision.next : null
  }

  // Lê, decide e grava na mesma transação: duas abas não perdem a gravação mais nova (R1).
  async function run(puzzleId: string, op: Op): Promise<void> {
    const db = await database()
    if (!db) {
      applyInMemory(puzzleId, op)
      return
    }
    try {
      const tx = db.transaction(STORE, 'readwrite')
      const raw = await tx.store.get(puzzleId)
      const current = raw === undefined ? null : parse(raw)
      const next = decide(current, op)
      if (next) await tx.store.put(next)
      else if (raw !== undefined && !current) await tx.store.delete(puzzleId)
      await tx.done
      const stored = next ?? current
      if (stored) memory.set(puzzleId, stored)
    } catch {
      fail()
      applyInMemory(puzzleId, op)
    }
  }

  // Gravações seguidas da mesma cruzada viram uma só: enquanto uma roda, só a mais nova espera.
  function enqueue(puzzleId: string, op: Op): Promise<void> {
    const slot = slots.get(puzzleId) ?? { ops: [], running: null }
    slots.set(puzzleId, slot)
    const last = slot.ops.at(-1)
    if (op.kind === 'save' && last?.kind === 'save') last.item = op.item
    else slot.ops.push(op)
    slot.running ??= (async () => {
      for (let next = slot.ops.shift(); next; next = slot.ops.shift()) await run(puzzleId, next)
      slot.running = null
    })()
    return slot.running
  }

  return {
    get: readOne,

    async getForPuzzle(puzzleId, grid) {
      const record = await readOne(puzzleId)
      if (!record) return null
      if (!cellsMatchGrid(grid, record.cells).success) {
        await remove(puzzleId)
        return null
      }
      return record
    },

    async getAll() {
      const db = await database()
      if (!db) return [...memory.values()]
      try {
        const values = await db.getAll(STORE)
        return values.flatMap((value) => parse(value) ?? [])
      } catch {
        fail()
        return [...memory.values()]
      }
    },

    async save(incoming) {
      await enqueue(incoming.puzzleId, { kind: 'save', item: incoming })
      return memory.get(incoming.puzzleId) ?? null
    },

    async reset(puzzleId) {
      await enqueue(puzzleId, { kind: 'reset' })
      return memory.get(puzzleId) ?? null
    },

    isAvailable: () => available,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

// Um único store por página; os testes trocam o `indexedDB` global e ele reabre sozinho.
export const guestStore = createGuestStore()
