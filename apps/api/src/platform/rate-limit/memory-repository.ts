import type { RateLimitKey, RateLimitRepository } from './rate-limit.repository'

export type MemoryRateRepository = RateLimitRepository & {
  rows: { id: string; key: RateLimitKey; at: Date }[]
}

const same = (a: RateLimitKey, b: RateLimitKey) =>
  a.action === b.action && a.keyType === b.keyType && a.keyValue === b.keyValue

// Só para os testes unitários: o mesmo contrato do repositório do banco, na memória.
export function createMemoryRateRepository(): MemoryRateRepository {
  const rows: MemoryRateRepository['rows'] = []
  let next = 0
  const repository: MemoryRateRepository = {
    rows,
    async countSince(key, since) {
      const hits = rows.filter((row) => same(row.key, key) && row.at > since)
      return {
        count: hits.length,
        oldest: hits.length ? new Date(Math.min(...hits.map((row) => row.at.getTime()))) : null,
      }
    },
    async insert(keys, createdAt = new Date()) {
      return keys.map((key) => {
        const id = String(next++)
        rows.push({ id, key, at: createdAt })
        return id
      })
    },
    async deleteByIds(ids) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (ids.includes((rows[i] as { id: string }).id)) rows.splice(i, 1)
      }
    },
    async clear(key) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (same((rows[i] as { key: RateLimitKey }).key, key)) rows.splice(i, 1)
      }
    },
    withKeyLocks: (_keys, run) => run(repository),
  }
  return repository
}
