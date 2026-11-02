import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders the title as the level-one heading when it is the whole page', () => {
    render(<ErrorState level={1} title="Algo deu errado" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Algo deu errado' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('renders the title as a level-two heading inside a page that already has a level one', () => {
    render(
      <>
        <h1>Hoje</h1>
        <ErrorState level={2} title="Sem conexão" />
      </>,
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Sem conexão' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toContainElement(screen.getByRole('heading', { level: 2 }))
  })
})
