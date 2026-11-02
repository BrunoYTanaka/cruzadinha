import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, StaticRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { SLOW_MESSAGE } from '../../../../shared/components/LoadingState/loading-screens'
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
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('é um link normal até o clique', () => {
    renderLink()
    const link = screen.getByRole('link', { name: 'Jogar agora' })
    expect(link).toHaveAttribute('href', '/jogar')
    expect(link).not.toHaveAttribute('aria-busy')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reage na hora ao clique, sem avançar o tempo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderLink()
    await user.click(screen.getByRole('link', { name: 'Jogar agora' }))
    const link = screen.getByRole('link', { name: 'Abrindo…' })
    expect(link).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
  })

  it('explica a demora depois de 2 s', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = renderLink()
    await user.click(screen.getByRole('link', { name: 'Jogar agora' }))
    act(() => vi.advanceTimersByTime(2_500))
    expect(screen.getByRole('status')).toHaveTextContent(SLOW_MESSAGE)
    await expectNoA11yViolations(container)
  })

  it('ignora o segundo clique', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderLink()
    await user.click(screen.getByRole('link', { name: 'Jogar agora' }))
    const link = screen.getByRole('link', { name: 'Abrindo…' })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      link.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })

  it('volta ao normal quando a navegação é cancelada (popstate)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderLink()
    await user.click(screen.getByRole('link', { name: 'Jogar agora' }))
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('link', { name: 'Jogar agora' })).not.toHaveAttribute('aria-busy')
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
