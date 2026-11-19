import { describe, expect, it } from 'vitest'
import { resolveAdminTab } from './useAdminTab'

describe('resolveAdminTab (feature 066)', () => {
  it.each([
    [null, ['casa'], 'fontes'],
    ['fontes', ['casa'], 'fontes'],
    ['casa', ['casa'], 'casa'],
    ['casa', [], 'fontes'],
    ['xyz', ['casa'], 'fontes'],
  ] as const)('%s com %j abre %s', (param, ids, expected) => {
    expect(resolveAdminTab(param, ids)).toBe(expected)
  })
})
