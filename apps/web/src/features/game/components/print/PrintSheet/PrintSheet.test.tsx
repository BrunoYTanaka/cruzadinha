import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { LAYOUT5, makePuzzle } from '../../../../../test/fixtures'
import { PrintSheet } from './PrintSheet'

const sheet = () => document.body.querySelector('[class*="sheet"]') as HTMLElement

describe('PrintSheet', () => {
  it('mostra fonte, data completa, grade numerada, dicas com tamanho e atribuição', () => {
    const puzzle = makePuzzle(LAYOUT5, '2026-10-30')
    render(<PrintSheet puzzle={puzzle} />)
    const text = sheet().textContent ?? ''
    expect(text).toContain('O Globo · 30 de outubro de 2026')
    expect(text).toContain('Horizontais')
    expect(text).toContain('Verticais')
    expect(text).toContain('Fonte: O Globo')
    const first = puzzle.words[0]!
    expect(text).toContain(`${first.number}. ${first.clue} (${first.length})`)
    expect(sheet().querySelectorAll('svg')).toHaveLength(
      puzzle.grid.cells.flat().filter((cell) => cell.kind === 'block').length,
    )
  })

  it('não leva nenhuma letra da solução: só números e texto das dicas', () => {
    const rows = ['XQZ', 'J#W', 'KVY']
    const puzzle = makePuzzle(rows)
    render(<PrintSheet puzzle={puzzle} />)
    const cells = Array.from(sheet().querySelectorAll('[class*="cell"]'))
    expect(cells.length).toBe(8)
    for (const cell of cells) expect(cell.textContent).toMatch(/^\d*$/)
  })

  it('mantém acentos das dicas', () => {
    const puzzle = makePuzzle(['AB', 'CD'])
    puzzle.words[0]!.clue = 'Maçã, ação e café'
    render(<PrintSheet puzzle={puzzle} />)
    expect(sheet().textContent).toContain('Maçã, ação e café')
  })

  it('não tem violação de acessibilidade', async () => {
    render(<PrintSheet puzzle={makePuzzle(LAYOUT5)} />)
    await expectNoA11yViolations(document.body)
  })
})
