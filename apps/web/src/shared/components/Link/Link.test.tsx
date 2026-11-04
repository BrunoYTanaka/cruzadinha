import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { readCss } from '../../../test/css-file'
import { ExternalLink, Link } from './Link'

describe('Link', () => {
  it('navega dentro do site e aceita className extra', async () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="/conta" className="extra">
          Sua conta
        </Link>
        <ExternalLink href="https://example.com">Fora</ExternalLink>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Sua conta' })
    expect(link).toHaveAttribute('href', '/conta')
    expect(link).toHaveClass('extra')
    expect(screen.getByRole('link', { name: 'Fora' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    await expectNoA11yViolations(container)
  })
})

describe('Link.module.css', () => {
  const css = readCss('Link.module.css')

  it('sublinha com 3 px, 280 ms, e 5 px no clique', () => {
    expect(css).toMatch(/0% 3px no-repeat/)
    expect(css).toMatch(/transition:\s*background-size 280ms/)
    expect(css).toMatch(/\.link:active\s*{[^}]*100% 5px/)
  })

  it('o sublinhado corre só com ponteiro que passa por cima e sem movimento reduzido', () => {
    expect(css).toMatch(/@media \(hover: hover\)\s*{\s*\.link:hover\s*{[^}]*100% 3px/)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*{\s*\.link\s*{\s*transition: none/,
    )
  })

  it('não usa cor fixa', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})
