import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { feminineCount } from '../../helpers/count-words'
import { FeatureCards } from './FeatureCards'

describe('FeatureCards', () => {
  it('tem rótulo, título e três cartões com título próprio', () => {
    render(<FeatureCards />)
    expect(screen.getByText('Como funciona')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Abriu, jogou. O resto é opcional.' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Sem conta para começar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Funciona até sem internet' })).toBeInTheDocument()
  })

  it('os ícones 1↓, 2→ e 3↓ são decoração', () => {
    const { container } = render(<FeatureCards />)
    const icons = Array.from(container.querySelectorAll('article > span[aria-hidden="true"]'))
    expect(icons.map((icon) => icon.textContent)).toEqual(['1↓', '2→', '3↓'])
  })

  it('conta as fontes pela lista do jogo', () => {
    render(<FeatureCards />)
    const words = feminineCount(puzzleSourceIdSchema.options.length)
    expect(
      screen.getByRole('heading', {
        name: new RegExp(`^Uma cruzada por dia, de ${words} fontes$`),
      }),
    ).toBeInTheDocument()
  })

  it('tem as cinco pílulas de recursos', () => {
    render(<FeatureCards />)
    const pills = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(pills).toEqual([
      'Modo lápis para rascunhar',
      'Atalhos de teclado (tecle ?)',
      'Tema claro e escuro',
      'Tabuleiro que se ajusta à tela',
      'Cronômetro que pausa sozinho',
    ])
  })

  it('passa no axe', async () => {
    const { container } = render(<FeatureCards />)
    await expectNoA11yViolations(container)
  })

  it('o cartão do meio só desce em tela larga e o CSS não tem cor fixa', () => {
    const css = readCss('FeatureCards.module.css')
    const wide = css.slice(css.indexOf('@media (min-width'))
    expect(css.slice(0, css.indexOf('@media'))).not.toContain('translateY')
    expect(wide).toContain('nth-child(2)')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
