import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { FinalBand } from './FinalBand'

const renderBand = () =>
  render(
    <MemoryRouter>
      <FinalBand />
    </MemoryRouter>,
  )

describe('FinalBand', () => {
  it('tem o título da faixa e leva ao jogo de hoje e ao calendário', () => {
    renderBand()
    expect(
      screen.getByRole('heading', { level: 2, name: 'A cruzada de hoje já está esperando.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jogar agora' })).toHaveAttribute('href', '/jogar')
    expect(screen.getByRole('link', { name: 'Ver o calendário' })).toHaveAttribute(
      'href',
      '/calendario',
    )
  })

  it.each(['light', 'dark'])('passa no axe no tema %s', async (theme) => {
    document.documentElement.dataset.theme = theme
    const { container } = renderBand()
    await expectNoA11yViolations(container)
    delete document.documentElement.dataset.theme
  })

  it('a faixa não usa a largura da janela, margem negativa nem cor fixa', () => {
    const css = readCss('FinalBand.module.css')
    expect(css).not.toContain('100vw')
    expect(css).not.toMatch(/margin[^;]*:\s*-/)
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
