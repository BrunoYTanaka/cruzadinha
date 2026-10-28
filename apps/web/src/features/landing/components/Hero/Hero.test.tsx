import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readCss } from '../../../../test/css-file'
import { Hero } from './Hero'

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )

describe('Hero', () => {
  it('tem o único h1 como texto, com as casas só de decoração', () => {
    const { container } = renderHero()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Cruzadinha')
    expect(container.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(10)
  })

  it('chama para jogar a cruzada de hoje e para experimentar na página', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'Jogar a cruzada de hoje' })).toHaveAttribute(
      'href',
      '/jogar',
    )
    expect(screen.getByRole('link', { name: 'Experimentar aqui' })).toHaveAttribute(
      'href',
      '#mini-cruzada',
    )
  })

  it('anima só com movimento permitido, e só com transform e opacity', () => {
    const css = readCss('Hero.module.css')
    const media = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'))
    expect(media).toContain('animation:')
    expect(css.slice(0, css.indexOf('@media'))).not.toContain('animation')
    const keyframes = css.slice(css.indexOf('@keyframes'))
    expect(keyframes).toContain('transform')
    expect(keyframes).not.toMatch(/\b(width|height|top|left|margin|padding)\b/)
  })

  describe('"Experimentar aqui"', () => {
    afterEach(() => vi.unstubAllGlobals())

    async function clickTry(reduce: boolean) {
      const scrollIntoView = vi.fn()
      const target = document.createElement('section')
      target.id = 'mini-cruzada'
      target.scrollIntoView = scrollIntoView
      document.body.append(target)
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      renderHero()
      await userEvent.click(screen.getByRole('link', { name: 'Experimentar aqui' }))
      target.remove()
      return scrollIntoView
    }

    it('rola suave até a mini cruzada', async () => {
      const scroll = await clickTry(false)
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    })

    it('com movimento reduzido rola direto', async () => {
      const scroll = await clickTry(true)
      expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    })
  })
})
