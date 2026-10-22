import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiRequest } from '../api/client'
import { ErrorState, LoadingState } from './ErrorState'

afterEach(() => {
  vi.useRealTimers()
})

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

describe('LoadingState', () => {
  it('shows its label when nothing is slow', () => {
    render(<LoadingState label="Carregando a biblioteca…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a biblioteca…')
  })

  it('explains the wait when a request takes 2 s or more', async () => {
    vi.useFakeTimers()
    let resolve: (response: Response) => void = () => {}
    const pending = apiRequest('/api/library', z.object({}), {
      fetch: () =>
        new Promise<Response>((ok) => {
          resolve = ok
        }),
    })
    render(<LoadingState label="Carregando a biblioteca…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a biblioteca…')

    act(() => vi.advanceTimersByTime(2_500))
    expect(screen.getByRole('status')).toHaveTextContent('Acordando o servidor…')
    expect(screen.getByRole('status')).toHaveTextContent('Pode levar até um minuto.')

    resolve(new Response('{}', { status: 200 }))
    await act(async () => {
      await pending
    })
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a biblioteca…')
  })
})
