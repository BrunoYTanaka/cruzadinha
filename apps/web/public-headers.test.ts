// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// O site é aberto a quem tem o endereço, mas só a landing (/) é divulgada em buscadores
// (constitution VIII, emenda 5.0.0; feature 048): estas instruções não podem mudar sem um teste
// falhar.
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

const blocks = headerBlocks(readFileSync(join(publicDir, '_headers'), 'utf8'))

describe('instruções para buscadores', () => {
  it('_headers manda não indexar nem seguir links por padrão, em todas as páginas', () => {
    expect(blocks.get('/*')).toContain('X-Robots-Tag: noindex, nofollow')
  })

  it('só a landing e os arquivos para buscadores tiram o noindex', () => {
    for (const path of ['/', '/sitemap.xml', '/robots.txt']) {
      expect(blocks.get(path)).toContain('! X-Robots-Tag')
    }
    const detached = [...blocks].filter(([, headers]) => headers.includes('! X-Robots-Tag'))
    expect(detached.map(([path]) => path).sort()).toEqual(['/', '/robots.txt', '/sitemap.xml'])
  })

  it('nenhuma outra regra define o X-Robots-Tag', () => {
    const setting = [...blocks].filter(([, headers]) =>
      headers.some((header) => header.startsWith('X-Robots-Tag:')),
    )
    expect(setting.map(([path]) => path)).toEqual(['/*'])
  })

  it('o robots.txt vem do build, não de public/ (o plugin gera com o SITE_URL)', () => {
    expect(existsSync(join(publicDir, 'robots.txt'))).toBe(false)
  })
})
