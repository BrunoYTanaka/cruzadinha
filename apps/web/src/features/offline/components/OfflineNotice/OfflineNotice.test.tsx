import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { OfflineNotice } from './OfflineNotice'

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'))
  })
}

afterEach(() => setOnline(true))

describe('OfflineNotice', () => {
  it('não aparece com rede', () => {
    render(<OfflineNotice />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('avisa "Sem conexão" sem rede e some quando a rede volta', async () => {
    setOnline(false)
    const { container } = render(<OfflineNotice />)
    expect(screen.getByRole('status')).toHaveTextContent('Sem conexão')
    await expectNoA11yViolations(container)
    setOnline(true)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
