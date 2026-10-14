import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { THEME_KEY } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('mostra "Tema: Auto" e alterna auto → claro → escuro → auto', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /Tema: Auto/ })
    expect(button).toHaveTextContent('Tema: Auto')
    expect(document.documentElement).not.toHaveAttribute('data-theme')

    await user.click(button)
    expect(button).toHaveTextContent('Tema: Claro')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    await user.click(button)
    expect(button).toHaveTextContent('Tema: Escuro')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await user.click(button)
    expect(button).toHaveTextContent('Tema: Auto')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })

  it('grava a escolha e a lembra na próxima montagem', async () => {
    const user = userEvent.setup()
    const first = render(<ThemeToggle />)
    await user.click(screen.getByRole('button'))
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')
    first.unmount()
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveTextContent('Tema: Claro')
  })

  it('sem armazenamento segue funcionando (a preferência do sistema decide)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('button'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
