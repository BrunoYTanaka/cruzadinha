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

  it('não leva nada do mockup que só servia de prévia (FR-019)', () => {
    const { container } = renderLanding()
    expect(container.textContent).not.toContain('Prévia de design')
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0)
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

describe('LandingContent.module.css (feature 049)', () => {
  const css = readCss('LandingContent.module.css')

  it('não leva cor fixa: tokens e derivados deles', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('a entrada ao rolar só roda com animação permitida e com suporte', () => {
    const before = css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'))
    expect(before).not.toContain('animation')
    expect(css).toContain('@supports (animation-timeline: view())')
  })
})
