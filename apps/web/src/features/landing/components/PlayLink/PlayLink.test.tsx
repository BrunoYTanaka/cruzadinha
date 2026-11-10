import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, StaticRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PlayLink } from './PlayLink'

const renderLink = () =>
  render(
    <MemoryRouter>
      <PlayLink to="/jogar" variant="primary">
        Jogar agora
      </PlayLink>
    </MemoryRouter>,
  )

describe('PlayLink', () => {
  it('é um link normal', () => {
    renderLink()
    const link = screen.getByRole('link', { name: 'Jogar agora' })
    expect(link).toHaveAttribute('href', '/jogar')
    expect(link).not.toHaveAttribute('aria-busy')
  })

  // Feature 063: a espera é a tela do AppLayout; o botão não vira "Abrindo…" nem ganha balão.
  it('não muda ao clique', async () => {
    renderLink()
    await userEvent.click(screen.getByRole('link', { name: 'Jogar agora' }))
    expect(screen.queryByText('Abrindo…')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renderiza num StaticRouter, como o prerender da landing', () => {
    const html = renderToString(
      <StaticRouter location="/">
        <PlayLink to="/jogar" variant="primary">
          Jogar agora
        </PlayLink>
      </StaticRouter>,
    )
    expect(html).toContain('href="/jogar"')
    expect(html).toContain('Jogar agora')
  })
})
