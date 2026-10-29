import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// O desafio do Turnstile (feature 049) roda num quadro de challenges.cloudflare.com em /cadastro e
// /esqueci-a-senha. Uma política de conteúdo sem a liberação, ou `no-referrer` nessas duas telas,
// poderia quebrá-lo: este teste falha antes de isso chegar à produção.
const file = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')

function blocks(): Map<string, string[]> {
  const result = new Map<string, string[]>()
  let current: string[] | null = null
  for (const line of file.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (!line.startsWith(' ')) {
      current = []
      result.set(line.trim(), current)
    } else current?.push(line.trim())
  }
  return result
}

describe('public/_headers e o desafio do captcha', () => {
  it('não define política de conteúdo (nada bloquearia challenges.cloudflare.com)', () => {
    expect(file).not.toMatch(/content-security-policy/i)
  })

  it.each(['/cadastro', '/esqueci-a-senha'])('%s não recebe Referrer-Policy', (path) => {
    const rules = blocks()
    expect(rules.get(path)).toBeUndefined()
    expect(rules.get('/*')?.join('\n') ?? '').not.toMatch(/referrer-policy/i)
  })

  it('o no-referrer fica só nas rotas com token no fragmento, sem desafio', () => {
    const withNoReferrer = [...blocks()]
      .filter(([, rules]) => rules.some((rule) => /referrer-policy:\s*no-referrer/i.test(rule)))
      .map(([path]) => path)
    expect(withNoReferrer.sort()).toEqual([
      '/confirmar-email',
      '/redefinir-senha',
      '/verificar-email',
    ])
  })
})
