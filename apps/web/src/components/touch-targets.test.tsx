import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// O jsdom não calcula layout; o tamanho mínimo é garantido lendo o CSS que o define.
const root = join(import.meta.dirname, '..')
const css = (path: string) => readFileSync(join(root, path), 'utf8')

function rule(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`regra ${selector} não encontrada`)
  return source.slice(start, source.indexOf('}', start))
}

const px = (value: string): number => (value === 'var(--tap)' ? 44 : parseInt(value, 10))

function size(block: string, property: string): number {
  const match = block.match(new RegExp(`(?:^|\\s)${property}:\\s*([^;]+);`))
  if (!match?.[1]) throw new Error(`${property} ausente`)
  return px(match[1].trim())
}

describe('alvos de toque (fora do tabuleiro)', () => {
  it('o token --tap vale 44 px', () => {
    expect(css('themes/tokens.css')).toMatch(/--tap:\s*44px/)
  })

  it.each([
    ['themes/global.css', 'button'],
    ['components/Button.module.css', '.button'],
    ['components/Pill.module.css', '.pill'],
    ['features/game/Keyboard.module.css', '.key'],
  ])('%s %s tem altura mínima de 44 px', (file, selector) => {
    expect(size(rule(css(file), selector), 'min-height')).toBeGreaterThanOrEqual(44)
  })

  it('campos de formulário têm altura mínima de 44 px', () => {
    expect(
      size(rule(css('components/Field.module.css'), '.input'), 'min-height'),
    ).toBeGreaterThanOrEqual(44)
  })

  it.each([
    ['features/game/Toolbar.module.css', '.iconButton'],
    ['features/game/LegendButton.module.css', '.button'],
  ])('%s %s tem pelo menos 44 × 44 px', (file, selector) => {
    const block = rule(css(file), selector)
    expect(size(block, 'width')).toBeGreaterThanOrEqual(44)
    expect(size(block, 'height')).toBeGreaterThanOrEqual(44)
  })

  it('a navegação do calendário tem 44 px de largura (a altura vem do botão base)', () => {
    expect(
      size(rule(css('features/library/Calendar.module.css'), '.nav'), 'width'),
    ).toBeGreaterThanOrEqual(44)
  })

  it('exceção assumida: as células do tabuleiro têm 30 px no celular (e crescem no computador)', () => {
    const board = css('features/game/Board.module.css')
    expect(board).toMatch(/clamp\(24px, calc\(\(100vw - 30px\) \/ var\(--cols\)\), 64px\)/)
    expect(board).toMatch(/30px,\s*min\(/)
  })
})
