import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { LandingContent } from './LandingContent'

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingContent />
    </MemoryRouter>,
  )

describe('LandingContent', () => {
  it('tem um único título principal', () => {
    renderLanding()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    const { container } = renderLanding()
    await expectNoA11yViolations(container)
    delete document.documentElement.dataset.theme
  })
})

describe('LandingContent: rolagem, foco e movimento (feature 048)', () => {
  it('deixa a âncora longe do topo e não deixa o site inteiro rolar suave', () => {
    expect(readCss('MiniCrossword.module.css')).toContain('scroll-margin-top')
    expect(readCss('global.css')).not.toMatch(/scroll-behavior:\s*smooth/)
  })

  it('todo controle da landing é alcançável pelo teclado, na ordem do documento', () => {
    renderLanding()
    const stops = screen
      .getAllByRole('link')
      .concat(screen.getAllByRole('button'))
      .concat(screen.getAllByRole('grid'))
    for (const element of stops) {
      expect(element.tabIndex).toBeGreaterThanOrEqual(0)
    }
    const names = screen.getAllByRole('link').map((link) => link.textContent)
    expect(names.slice(0, 2)).toEqual(['Jogar a cruzada de hoje', 'Experimentar aqui'])
  })

  it('o foco do tabuleiro e dos botões é visível (contorno por token de foco)', () => {
    expect(readCss('MiniCrossword.module.css')).toMatch(
      /\.grid:focus-visible\s*\{[^}]*outline:[^;]*var\(--focus\)/,
    )
    expect(readCss('global.css')).toContain(':focus-visible')
  })
})
