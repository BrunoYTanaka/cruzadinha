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
  // Barra entre palavras vizinhas (feature 030): sobre a célula e sobre a palavra ativa. Na célula
  // selecionada a barra usa --sel-ink sobre --sel (já coberto em TEXT_PAIRS).
  ['--bar', '--cell'],
  ['--bar', '--word'],
  // Alças de redimensionar (feature 011): em repouso (--mute) e no hover e no foco (--accent).
  ['--mute', '--bg'],
  ['--mute', '--surface'],
  ['--accent', '--bg'],
  ['--accent', '--surface'],
  // Botões ‹ › da barra da dica ativa, sobre o fundo da palavra ativa.
  ['--ink', '--word'],
  // Barra de rolagem (FR-025 da feature 011), sobre a página e sobre superfícies.
  ['--scrollbar', '--bg'],
  ['--scrollbar', '--surface'],
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

// Estados dos botões (feature 023): as sobreposições translúcidas `--hover-overlay` e
// `--press-overlay` (`rgb(r g b / a)`) misturadas sobre o fundo de cada controle.
type Overlay = { rgb: [number, number, number]; alpha: number }

function readOverlays(block: string): Record<string, Overlay> {
  const overlays: Record<string, Overlay> = {}
  const pattern = /(--[\w-]+):\s*rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)\s*;/g
  for (const [, name, r, g, b, alpha] of block.matchAll(pattern)) {
    if (name) overlays[name] = { rgb: [Number(r), Number(g), Number(b)], alpha: Number(alpha) }
  }
  return overlays
}

function blend(overlay: Overlay, base: string): string {
  const channels = [1, 3, 5].map((index, channel) => {
    const value = parseInt(base.slice(index, index + 2), 16)
    const mixed = Math.round(
      (overlay.rgb[channel] ?? 0) * overlay.alpha + value * (1 - overlay.alpha),
    )
    return mixed.toString(16).padStart(2, '0')
  })
  return `#${channels.join('')}`
}

const overlayThemes: Record<string, Record<string, Overlay>> = {
  claro: readOverlays(lightCss),
  escuro: readOverlays(darkBlock(darkCss)),
}

// Limite dos botões secundário e discreto contra o que está em volta (3:1, SC-001).
const BUTTON_LINE_PAIRS: [string, string][] = [
  ['--control-line', '--bg'],
  ['--control-line', '--surface'],
]

// Texto do botão sobre o fundo em repouso, com o mouse e pressionado (4,5:1, SC-004).
const BUTTON_TEXT_PAIRS: [string, string][] = [
  ['--ink', '--control'],
  ['--ink', '--surface'],
  ['--ink', '--bg'],
  ['--ink', '--pill'],
  ['--accent-ink', '--accent'],
]

describe.each(Object.entries(themes))('estados dos botões (%s)', (name, tokens) => {
  const get = (token: string) => {
    const value = tokens[token]
    if (!value) throw new Error(`token ${token} ausente`)
    return value
  }
  const overlay = (token: string) => {
    const value = overlayThemes[name]?.[token]
    if (!value) throw new Error(`sobreposição ${token} ausente`)
    return value
  }
  const states = (background: string) => [
    get(background),
    blend(overlay('--hover-overlay'), get(background)),
    blend(overlay('--press-overlay'), get(background)),
  ]

  it.each(BUTTON_LINE_PAIRS)('%s contra %s tem pelo menos 3:1', (line, background) => {
    expect(contrast(get(line), get(background))).toBeGreaterThanOrEqual(3)
  })

  it.each(BUTTON_TEXT_PAIRS)(
    '%s sobre %s tem pelo menos 4,5:1 em repouso, com o mouse e pressionado',
    (text, background) => {
      for (const state of states(background)) {
        expect(contrast(get(text), state)).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  it('as setas da barra da dica, pressionadas sobre --word, têm pelo menos 3:1', () => {
    for (const state of states('--word')) {
      expect(contrast(get('--ink'), state)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('tokens', () => {
  it('os dois blocos do tema escuro têm os mesmos tokens de controle', () => {
    const media = darkCss.slice(0, darkCss.indexOf(":root[data-theme='dark']"))
    const explicit = darkBlock(darkCss)
    for (const token of ['--control', '--control-line', '--hover-overlay', '--press-overlay']) {
      const value = (block: string) => block.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1]
      expect(value(media), token).toBeDefined()
      expect(value(media), token).toBe(value(explicit))
    }
  })

  it('os dois temas definem os mesmos tokens', () => {
    expect(Object.keys(themes['escuro'] ?? {}).sort()).toEqual(
      Object.keys(themes['claro'] ?? {}).sort(),
    )
  })
})
