import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const themesDir = join(import.meta.dirname, '..', 'themes')
const lightCss = readFileSync(join(themesDir, 'light.css'), 'utf8')
const darkCss = readFileSync(join(themesDir, 'dark.css'), 'utf8')

type Tokens = Record<string, string>

// Lê as variáveis de um bloco de CSS: `--nome: #rrggbb;`.
function readTokens(block: string): Tokens {
  const tokens: Tokens = {}
  for (const match of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const [, name, value] = match
    if (name && value) tokens[name] = value
  }
  return tokens
}

// O bloco do tema escuro explícito (`data-theme='dark'`); o do sistema tem os mesmos valores.
function darkBlock(css: string): string {
  const start = css.indexOf(":root[data-theme='dark']")
  return css.slice(start)
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

const themes: Record<string, Tokens> = {
  claro: readTokens(lightCss),
  escuro: readTokens(darkBlock(darkCss)),
}

// Texto (4,5:1): par [texto, fundo].
const TEXT_PAIRS: [string, string][] = [
  ['--ink', '--bg'],
  ['--ink', '--surface'],
  ['--ink', '--cell'],
  ['--ink', '--word'],
  ['--ink', '--pill'],
  ['--mute', '--bg'],
  ['--mute', '--surface'],
  ['--sel-ink', '--sel'],
  ['--accent-ink', '--accent'],
  ['--accent', '--surface'],
  ['--ok', '--ok-tint'],
  ['--warn', '--warn-tint'],
]

// Controles, foco e marcas de ajuda (3:1).
const CONTROL_PAIRS: [string, string][] = [
  ['--focus', '--bg'],
  ['--focus', '--surface'],
  ['--help', '--cell'],
  ['--bad', '--cell'],
]

// Estados do tabuleiro entre si: exceção assumida pelo autor (plan.md, Riscos 1). Não há mínimo;
// o teste só registra os valores medidos.
const STATE_PAIRS: [string, string][] = [
  ['--sel', '--cell'],
  ['--sel', '--word'],
  ['--word', '--cell'],
  ['--block', '--cell'],
  ['--cell-line', '--cell'],
]

describe.each(Object.entries(themes))('contraste dos tokens (%s)', (_name, tokens) => {
  const get = (name: string) => {
    const value = tokens[name]
    if (!value) throw new Error(`token ${name} ausente`)
    return value
  }

  it.each(TEXT_PAIRS)('%s sobre %s tem pelo menos 4,5:1', (foreground, background) => {
    expect(contrast(get(foreground), get(background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(CONTROL_PAIRS)('%s contra %s tem pelo menos 3:1', (foreground, background) => {
    expect(contrast(get(foreground), get(background))).toBeGreaterThanOrEqual(3)
  })

  it.each(STATE_PAIRS)('registra %s contra %s (sem mínimo, exceção documentada)', (a, b) => {
    expect(contrast(get(a), get(b))).toBeGreaterThanOrEqual(1)
  })
})

describe('tokens', () => {
  it('os dois temas definem os mesmos tokens', () => {
    expect(Object.keys(themes['escuro'] ?? {}).sort()).toEqual(
      Object.keys(themes['claro'] ?? {}).sort(),
    )
  })
})
