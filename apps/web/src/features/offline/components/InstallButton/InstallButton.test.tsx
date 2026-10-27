import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { captureInstallPrompt } from '../../hooks/useInstallPrompt/useInstallPrompt'
import { InstallButton } from './InstallButton'

let release: () => void
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  release = captureInstallPrompt()
})
afterEach(() => release())

describe('InstallButton', () => {
  it('não aparece sem convite de instalação', () => {
    render(<InstallButton />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mostra "Instalar" quando dá e abre o convite ao clicar', async () => {
    const { container } = render(<InstallButton />)
    const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
    const prompt = vi.fn(async () => undefined)
    Object.assign(event, { prompt })
    act(() => {
      window.dispatchEvent(event)
    })
    await expectNoA11yViolations(container)
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }))
    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument()
  })
})
