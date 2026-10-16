import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { API_VERSION } from './version'

describe('API_VERSION', () => {
  it('is the version of apps/api/package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version: string
    }
    expect(API_VERSION).toBe(pkg.version)
    expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
