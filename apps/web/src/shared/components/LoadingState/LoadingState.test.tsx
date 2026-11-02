import { act, render, screen } from '@testing-library/react'
import { z } from 'zod'
import { apiRequest } from '../../services/api/client/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { LoadingState } from './LoadingState'
import { LOADING_SCREENS, SLOW_MESSAGE, type LoadingScreen } from './loading-screens'

describe('LoadingState', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mostra o título e a palavra de cada tela', () => {
    for (const [name, { title, word }] of Object.entries(LOADING_SCREENS)) {
      const { container, unmount } = render(<LoadingState screen={name as LoadingScreen} />)
      expect(container.textContent).toContain(title)
      expect(container.querySelector('[aria-hidden="true"]')?.children).toHaveLength(
        [...word].length,
      )
      unmount()
    }
  })

  it('usa a tela de entrada quando nenhuma é informada', () => {
    render(<LoadingState />)
    expect(screen.getByText('Preparando as palavras…')).toBeInTheDocument()
  })

  it('só explica a demora depois de 2 s, sem trocar título nem casas', () => {
    const { container } = render(<LoadingState screen="game" />)
    const before = container.querySelector('[aria-hidden="true"]')?.textContent
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
    act(() => vi.advanceTimersByTime(1750))
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText(SLOW_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Montando a grade…')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(before)
    expect(screen.getByText(/\d+ s esperando/)).toBeInTheDocument()
  })

  it('explica a demora quando um pedido da API passa de 2 s', async () => {
    let resolve: (response: Response) => void = () => {}
    const pending = apiRequest('/api/library', z.object({}), {
      fetch: () =>
        new Promise<Response>((ok) => {
          resolve = ok
        }),
    })
    render(<LoadingState screen="library" />)
    act(() => vi.advanceTimersByTime(2_500))
    expect(screen.getByText(SLOW_MESSAGE)).toBeInTheDocument()
    resolve(new Response('{}', { status: 200 }))
    await act(async () => {
      await pending
    })
  })

  it('com immediate mostra a explicação na montagem', () => {
    render(<LoadingState immediate />)
    expect(screen.getByText(SLOW_MESSAGE)).toBeInTheDocument()
  })

  it('usa h1 ou h2 conforme o nível e leva o foco ao título com focusOnMount', () => {
    const { rerender } = render(<LoadingState level={1} focusOnMount />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    rerender(<LoadingState level={2} />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('não tem violação de acessibilidade nos dois estados', async () => {
    vi.useRealTimers()
    const { container, rerender } = render(<LoadingState level={1} />)
    await expectNoA11yViolations(container)
    rerender(<LoadingState level={1} immediate />)
    await expectNoA11yViolations(container)
  })
})
