import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { mockMatchMedia } from '../../../../test/media'
import { ServerWake } from './ServerWake'

beforeEach(() => {
  vi.useFakeTimers()
  mockMatchMedia(() => false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
})

describe('ServerWake', () => {
  it('shows only the loading text during the first 2 s', () => {
    render(<ServerWake />)
    act(() => vi.advanceTimersByTime(1_900))
    expect(screen.queryByText('Acordando o servidor')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
  })

  it('explains the wait after 2 s and counts the seconds', () => {
    render(<ServerWake />)
    act(() => vi.advanceTimersByTime(2_000))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Acordando o servidor' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'O servidor dorme quando ninguém está jogando. A primeira visita pode levar até um minuto.',
    )
    expect(screen.getByText('Esperando há 2 s')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('Esperando há 3 s')).toBeInTheDocument()
  })

  it('keeps the counter outside the live region', () => {
    render(<ServerWake />)
    act(() => vi.advanceTimersByTime(2_000))
    expect(screen.getByRole('status')).not.toHaveTextContent('Esperando há')
  })

  it('shows the message right away and focuses the title when immediate', () => {
    render(<ServerWake immediate focusOnMount />)
    const title = screen.getByRole('heading', { level: 1, name: 'Acordando o servidor' })
    expect(title).toHaveFocus()
    expect(screen.getByText('Esperando há 0 s')).toBeInTheDocument()
  })

  it('stops the animation when the person prefers reduced motion', () => {
    mockMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')
    render(<ServerWake immediate />)
    expect(screen.getByTestId('wake-indicator')).toHaveAttribute('data-animated', 'false')
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('Esperando há 1 s')).toBeInTheDocument()
  })

  it('animates the indicator otherwise', () => {
    render(<ServerWake immediate />)
    expect(screen.getByTestId('wake-indicator')).toHaveAttribute('data-animated', 'true')
  })

  it.each(['light', 'dark'])('has no accessibility violations in the %s theme', async (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    const { container } = render(<ServerWake immediate />)
    vi.useRealTimers()
    await expectNoA11yViolations(container)
  })
})
