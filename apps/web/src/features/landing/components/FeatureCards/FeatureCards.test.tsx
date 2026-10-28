import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { feminineCount } from '../../helpers/count-words'
import { FeatureCards } from './FeatureCards'

describe('FeatureCards', () => {
  it('mostra os três cartões e a linha de recursos', () => {
    render(<FeatureCards />)
    expect(screen.getByRole('heading', { name: 'Jogue sem conta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Funciona sem internet' })).toBeInTheDocument()
    for (const name of ['Modo lápis', 'Atalhos de teclado', 'Tema claro e escuro']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('conta as fontes pela lista do jogo', () => {
    render(<FeatureCards />)
    const words = feminineCount(puzzleSourceIdSchema.options.length)
    expect(
      screen.getByRole('heading', { name: new RegExp(`^${words} fontes de cruzadas$`, 'i') }),
    ).toBeInTheDocument()
  })
})
