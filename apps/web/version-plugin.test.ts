// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { siteVersionJson } from './version-plugin'

describe('siteVersionJson', () => {
  it('uses GITHUB_SHA when the CI provides it', () => {
    const json = siteVersionJson('0.3.1', { GITHUB_SHA: 'a'.repeat(40) }, 'b'.repeat(40))
    expect(JSON.parse(json)).toEqual({ version: '0.3.1', commit: 'a'.repeat(40) })
  })

  it('falls back to the local git HEAD', () => {
    const json = siteVersionJson('0.3.1', {}, 'b'.repeat(40))
    expect(JSON.parse(json)).toEqual({ version: '0.3.1', commit: 'b'.repeat(40) })
  })

  it('says "desconhecido" without CI nor git', () => {
    expect(JSON.parse(siteVersionJson('0.3.1', {}, undefined))).toEqual({
      version: '0.3.1',
      commit: 'desconhecido',
    })
  })
})
