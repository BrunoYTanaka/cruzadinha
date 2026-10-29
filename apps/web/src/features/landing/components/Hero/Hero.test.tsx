import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { Hero } from './Hero'

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )

describe('Hero', () => {
  it('tem o único h1, com a frase de destaque e o nome da página para quem não vê as casas', () => {
    renderHero()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe(
      'Cruzadinha: Palavras cruzadas todo dia, sem cadastro e sem pressa.',
    )
    expect(heading.querySelector('em')).toHaveTextContent('todo dia')
  })

  it('as dez casas do título, com os números 1, 2 e 3 nas casas 1, 5 e 7, são só decoração', () => {
    const { container } = renderHero()
    const title = container.querySelector('div[aria-hidden="true"]')
    const cells = Array.from(title?.querySelectorAll('span') ?? [])
    expect(cells.map((cell) => cell.firstChild?.textContent).join('')).toBe('CRUZADINHA')
    const numbered = cells
      .map((cell, index) => [index, cell.querySelector('small')?.textContent] as const)
      .filter(([, number]) => number)
    expect(numbered).toEqual([
      [0, '1'],
      [4, '2'],
      [6, '3'],
    ])
  })

  it('as letras soltas Ç, A e É são decoração, fora da leitura e do foco', () => {
    const { container } = renderHero()
    const floats = Array.from(container.querySelectorAll('section > span[aria-hidden="true"]'))
    expect(floats.map((float) => float.textContent)).toEqual(['Ç', 'A', 'É'])
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

  it('o texto de apoio traz a quantidade de fontes do jogo', () => {
    renderHero()
    const count = puzzleSourceIdSchema.options.length
    expect(screen.getByText(/Escolha entre \S+ fontes de cruzadas/)).toBeInTheDocument()
    expect(count).toBeGreaterThan(0)
  })

  it('passa no axe', async () => {
    const { container } = renderHero()
    await expectNoA11yViolations(container)
  })

  describe('CSS', () => {
    const css = readCss('Hero.module.css')
    const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'))

    it('anima só com movimento permitido', () => {
      expect(css.slice(0, css.indexOf('@media (prefers-reduced-motion'))).not.toContain('animation')
      expect(motion).toContain('animation:')
    })

    it('as casas caem com transform e opacity; o clarão só troca a cor de fundo', () => {
      const keyframes = css.slice(css.indexOf('@keyframes'))
      expect(keyframes).toContain('transform')
      expect(keyframes).not.toMatch(/\b(width|height|top|left|margin|padding)\b/)
      const flash = css.slice(css.indexOf('@keyframes flash'), css.indexOf('@keyframes drift'))
      expect(flash).toContain('background-color')
    })

    it('não usa 100vw nem cor fixa', () => {
      expect(css).not.toContain('100vw')
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    })
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
