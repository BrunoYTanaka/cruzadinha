import { openDB, type DBSchema } from 'idb'
import { z } from 'zod'

// Token do participante de cada duelo do visitante, neste aparelho (feature 058). A chave é o token
// do link do duelo; o token nunca vai para a URL de consulta.
export const DUEL_TOKENS_DB = 'cruzadinha-duelos'
const STORE = 'tokens'

interface TokensDB extends DBSchema {
  tokens: { key: string; value: unknown }
}

const recordSchema = z.strictObject({
  linkToken: z.string().min(1),
  participantToken: z.string().min(1),
  createdAt: z.string(),
})

export type DuelTokenRecord = z.infer<typeof recordSchema>

export type DuelTokenStore = {
  save(linkToken: string, participantToken: string): Promise<void>
  get(linkToken: string): Promise<string | null>
  list(): Promise<DuelTokenRecord[]>
  remove(linkToken: string): Promise<void>
}

// Quando o navegador não deixa guardar, fica só na memória desta aba.
export function createDuelTokenStore(
  options: { factory?: () => IDBFactory | undefined; now?: () => Date } = {},
): DuelTokenStore {
  const factory = options.factory ?? (() => globalThis.indexedDB)
  const now = options.now ?? (() => new Date())
  const memory = new Map<string, DuelTokenRecord>()
  let lastFactory: IDBFactory | undefined | null = null
  let opened: ReturnType<typeof open> | null = null

  function open() {
    return openDB<TokensDB>(DUEL_TOKENS_DB, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'linkToken' })
      },
    })
  }

  async function database() {
    let current: IDBFactory | undefined
    try {
      current = factory()
    } catch {
      current = undefined
    }
    if (current !== lastFactory) {
      lastFactory = current
      opened = null
      memory.clear()
    }
    if (!current) return null
    try {
      opened ??= open()
      return await opened
    } catch {
      return null
    }
  }

  return {
    async save(linkToken, participantToken) {
      const record = { linkToken, participantToken, createdAt: now().toISOString() }
      const db = await database()
      memory.set(linkToken, record)
      try {
        await db?.put(STORE, record)
      } catch {
        // fica na memória
      }
    },
    async get(linkToken) {
      try {
        const raw = await (await database())?.get(STORE, linkToken)
        const parsed = recordSchema.safeParse(raw)
        if (parsed.success) return parsed.data.participantToken
      } catch {
        // cai na memória
      }
      return memory.get(linkToken)?.participantToken ?? null
    },
    async list() {
      try {
        const rows = (await (await database())?.getAll(STORE)) ?? []
        const records = rows.flatMap((row) => {
          const parsed = recordSchema.safeParse(row)
          return parsed.success ? [parsed.data] : []
        })
        if (records.length > 0) return records
      } catch {
        // cai na memória
      }
      return [...memory.values()]
    },
    async remove(linkToken) {
      memory.delete(linkToken)
      try {
        await (await database())?.delete(STORE, linkToken)
      } catch {
        // nada a fazer
      }
    },
  }
}

export const duelTokens = createDuelTokenStore()
