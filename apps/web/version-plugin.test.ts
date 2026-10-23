// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { siteVersionJson } from './version-plugin'

const pluginPath = fileURLToPath(new URL('./version-plugin.ts', import.meta.url))

describe('siteVersionJson', () => {
  it('uses GITHUB_SHA when the CI provides it, without calling git', () => {
    const readHead = vi.fn(() => 'b'.repeat(40))
    const json = siteVersionJson('0.3.1', { GITHUB_SHA: 'a'.repeat(40) }, readHead)
    expect(JSON.parse(json)).toEqual({ version: '0.3.1', commit: 'a'.repeat(40) })
    expect(readHead).not.toHaveBeenCalled()
  })

  it('falls back to the local git HEAD', () => {
    const json = siteVersionJson('0.3.1', {}, () => 'b'.repeat(40))
    expect(JSON.parse(json)).toEqual({ version: '0.3.1', commit: 'b'.repeat(40) })
  })

  it('says "desconhecido" without CI nor git', () => {
    expect(JSON.parse(siteVersionJson('0.3.1', {}, () => undefined))).toEqual({
      version: '0.3.1',
      commit: 'desconhecido',
    })
  })

  it('treats an empty GITHUB_SHA as missing', () => {
    const json = siteVersionJson('0.3.1', { GITHUB_SHA: '' }, () => 'c'.repeat(40))
    expect(JSON.parse(json)).toEqual({ version: '0.3.1', commit: 'c'.repeat(40) })
  })
})

// Um hook do git (pre-push) exporta GIT_DIR e afins, e o git filho acharia o repositório mesmo
// fora dele.
function gitFreeEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
}

describe('readGitHead', () => {
  it('returns undefined outside a repository and leaves nothing on stderr', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cruzadinha-nogit-'))
    // O git filho herdaria o stderr do processo, então a leitura roda num Node à parte, de onde o
    // stderr pode ser capturado por inteiro.
    const script = `import(${JSON.stringify(pluginPath)}).then((m) => {
      process.stdout.write(String(m.readGitHead(process.argv[1])))
    })`
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, dir], {
      encoding: 'utf8',
      env: { ...gitFreeEnv(), GIT_CEILING_DIRECTORIES: tmpdir() },
    })
    expect(result.stdout).toBe('undefined')
    expect(result.stderr).toBe('')
  })
})
