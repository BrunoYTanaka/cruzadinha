import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiRequest } from '../api/client'
import { LoadingState } from './ErrorState'

afterEach(() => {
  vi.useRealTimers()
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
