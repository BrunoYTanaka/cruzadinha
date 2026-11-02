import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDuelTokenStore } from './duel-tokens'

describe('duel token store', () => {
  it('saves, reads, lists and removes by link token', async () => {
    const store = createDuelTokenStore({ factory: () => new IDBFactory() })
    await store.save('link-a', 'token-a')
    await store.save('link-b', 'token-b')
    expect(await store.get('link-a')).toBe('token-a')
    expect((await store.list()).map((r) => r.linkToken).sort()).toEqual(['link-a', 'link-b'])
    await store.remove('link-a')
    expect(await store.get('link-a')).toBeNull()
  })

  it('falls back to memory when IndexedDB is unavailable', async () => {
    const store = createDuelTokenStore({ factory: () => undefined })
    await store.save('link-a', 'token-a')
    expect(await store.get('link-a')).toBe('token-a')
    expect(await store.list()).toHaveLength(1)
  })
})
