import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router'
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readCss } from '../../../../test/css-file'
import { landingButtonClass } from './LandingButton'

describe('landingButtonClass', () => {
  it('dá classes diferentes ao botão principal e ao quieto', () => {
    expect(landingButtonClass({ variant: 'primary' })).not.toBe(
      landingButtonClass({ variant: 'quiet' }),
    )
  })

  it('o tamanho pequeno acrescenta uma classe', () => {
    const regular = landingButtonClass({ variant: 'primary' })
    const small = landingButtonClass({ variant: 'primary', size: 'small' })
    expect(small.split(' ').length).toBe(regular.split(' ').length + 1)
  })

  it('serve a link e a botão', () => {
    render(
      <MemoryRouter>
        <Link to="/jogar" className={landingButtonClass({ variant: 'primary' })}>
          Jogar
        </Link>
        <button type="button" className={landingButtonClass({ variant: 'quiet', size: 'small' })}>
          Limpar
        </button>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Jogar' }).className).toContain('button')
    expect(screen.getByRole('button', { name: 'Limpar' }).className).toContain('button')
  })
})

describe('LandingButton.module.css', () => {
  const css = readCss('LandingButton.module.css')

  it('só lê tokens: nenhuma cor fixa', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('só move o botão com animação permitida e com ponteiro', () => {
    const transition = css.slice(css.indexOf('transition:'))
    expect(css.indexOf('@media (prefers-reduced-motion: no-preference)')).toBeLessThan(
      css.indexOf('transition:'),
    )
    expect(transition).toContain('transform')
    expect(css).toContain('@media (hover: hover)')
  })

  it('o botão tem a área mínima de toque, também o pequeno', () => {
    expect(css).toContain('min-height: var(--tap)')
    const small = css.slice(css.indexOf('.small {'), css.indexOf('.small.primary'))
    expect(small).not.toContain('min-height')
  })
})

// O estilo novo é só da landing (feature 049, FR-014): nenhum módulo dela mexe em `:root`, `html`,
// `body` nem em elemento solto, e as quatro variantes do botão do site não mudam.
describe('o estilo da landing não vaza para o resto do site', () => {
  const landing = join(import.meta.dirname, '..', '..')
  const cssFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? cssFiles(join(dir, entry.name))
        : entry.name.endsWith('.css')
          ? [join(dir, entry.name)]
          : [],
    )

  it.each(cssFiles(landing).map((file) => [file.slice(landing.length)]))(
    '%s só tem seletores com classe própria',
    (name) => {
      const css = readFileSync(join(landing, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const selectors = [...css.matchAll(/(?:^|\})\s*([^{}@]+?)\s*\{/g)]
        .map((match) => match[1] as string)
        .filter((selector) => !/^(from|to|\d+%)$/.test(selector))
      for (const selector of selectors.flatMap((group) => group.split(','))) {
        expect(selector.trim(), `${name}: ${selector}`).toMatch(/\./)
        expect(selector).not.toMatch(/^\s*(:root|html|body)\b/)
      }
    },
  )

  it('o botão do site continua com as quatro variantes', () => {
    const css = readCss('Button.module.css')
    for (const variant of ['.primary', '.secondary', '.quiet', '.icon']) {
      expect(css).toContain(variant)
    }
  })
})
