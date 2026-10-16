// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// O site é aberto a quem tem o endereço, mas não é divulgado em buscadores (constitution VIII,
// feature 013, FR-025): estas duas instruções não podem sumir sem um teste falhar.
const publicDir = join(import.meta.dirname, 'public')

// Blocos do `_headers` do Cloudflare Pages: um caminho na coluna 0 e os cabeçalhos indentados.
function headerBlocks(text: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>()
  let current: string[] | null = null
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = []
      blocks.set(line.trim(), current)
    } else {
      current?.push(line.trim())
    }
  }
  return blocks
}

describe('instruções para buscadores', () => {
  it('_headers manda não indexar nem seguir links em todas as páginas', () => {
    const blocks = headerBlocks(readFileSync(join(publicDir, '_headers'), 'utf8'))
    expect(blocks.get('/*')).toContain('X-Robots-Tag: noindex, nofollow')
  })

  it('robots.txt bloqueia todos os robôs', () => {
    const lines = readFileSync(join(publicDir, 'robots.txt'), 'utf8')
      .split('\n')
      .map((line) => line.trim())
    expect(lines).toContain('User-agent: *')
    expect(lines).toContain('Disallow: /')
  })
})
