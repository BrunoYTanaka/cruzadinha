import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FinalBand } from './FinalBand'

describe('FinalBand', () => {
  it('leva ao jogo de hoje e ao calendário', () => {
    render(
      <MemoryRouter>
        <FinalBand />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Jogar agora' })).toHaveAttribute('href', '/jogar')
    expect(screen.getByRole('link', { name: 'Ver o calendário' })).toHaveAttribute(
      'href',
      '/calendario',
    )
  })
})
