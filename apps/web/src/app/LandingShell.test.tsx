import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../test/axe'
import { LandingShell } from './LandingShell'

describe('LandingShell', () => {
  it('traz o link de pular, o cabeçalho e o main com um único h1', async () => {
    const { container } = render(
      <MemoryRouter>
        <LandingShell />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      '#conteudo',
    )
    expect(screen.getByRole('link', { name: 'Cruzadinha' })).toHaveAttribute('href', '/')
    // Feature 063: o cabeçalho da landing tem só a marca; "Entrar" ou a conta entram ao montar.
    expect(screen.queryByRole('link', { name: 'Calendário' })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoA11yViolations(container)
  })
})
