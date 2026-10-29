import { puzzleSourceIdSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { SOURCE_DESCRIPTIONS } from '../../helpers/source-descriptions'
import { SourcesSection } from './SourcesSection'

describe('SourcesSection', () => {
  it('mostra uma entrada por fonte do jogo, na ordem do jogo, com nome e descrição', () => {
    render(<SourcesSection />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(puzzleSourceIdSchema.options.length)
    puzzleSourceIdSchema.options.forEach((id, index) => {
      const item = items[index] as HTMLElement
      expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(
        puzzleSourceNames[id],
      )
      expect(item).toHaveTextContent(SOURCE_DESCRIPTIONS[id])
    })
  })

  it('uma fonte a mais na lista entra na seção sozinha', () => {
    render(<SourcesSection sources={['oglobo']} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('tem rótulo e o título com a quantidade de fontes do jogo', () => {
    render(<SourcesSection />)
    expect(screen.getByText('Fontes')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: `${puzzleSourceIdSchema.options.length} fontes, um só lugar.`,
      }),
    ).toBeInTheDocument()
  })

  it('o título acompanha a quantidade e fica no singular com uma só', () => {
    render(<SourcesSection sources={['oglobo']} />)
    expect(
      screen.getByRole('heading', { level: 2, name: '1 fonte, um só lugar.' }),
    ).toBeInTheDocument()
  })

  it('mantém a nota de que as cruzadas pertencem às fontes', () => {
    render(<SourcesSection />)
    expect(screen.getByText(/As cruzadas pertencem às fontes/)).toBeInTheDocument()
  })

  it('o realce só vem com ponteiro e a transição só com animação permitida', () => {
    const css = readCss('SourcesSection.module.css')
    expect(css).toContain('@media (hover: hover)')
    expect(css.slice(0, css.indexOf('@media (prefers-reduced-motion'))).not.toContain('transition')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    const { container } = render(<SourcesSection />)
    await expectNoA11yViolations(container)
    delete document.documentElement.dataset.theme
  })
})
