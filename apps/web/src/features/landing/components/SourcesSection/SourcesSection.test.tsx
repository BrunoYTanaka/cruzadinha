import { puzzleSourceIdSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
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

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    const { container } = render(<SourcesSection />)
    await expectNoA11yViolations(container)
    delete document.documentElement.dataset.theme
  })
})
