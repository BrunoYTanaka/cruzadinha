import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, updateSettings } from '../services/settings-store'
import { expectNoA11yViolations } from '../../test/axe'
import { installThemeSync } from './theme'
import { ThemeButton } from './ThemeButton'
import * as transition from './theme-transition'

let stopSync: () => void = () => {}

beforeEach(() => {
  updateSettings({ theme: 'light' })
  stopSync = installThemeSync()
})

afterEach(() => {
  stopSync()
  vi.restoreAllMocks()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeButton', () => {
  it('avança claro → escuro → automático → claro, com o nome dizendo o atual e o próximo', async () => {
    const user = userEvent.setup()
    render(<ThemeButton />)
    const button = screen.getByRole('button', { name: 'Tema: claro. Mudar para escuro' })
    expect(button).toHaveTextContent('Claro')

    await user.click(button)
    expect(getSettings().theme).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(button).toHaveAccessibleName('Tema: escuro. Mudar para automático')

    await user.click(button)
    expect(getSettings().theme).toBe('auto')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(button).toHaveAccessibleName('Tema: automático. Mudar para claro')

    await user.click(button)
    expect(getSettings().theme).toBe('light')
  })

  it('Enter e Espaço também avançam', async () => {
    const user = userEvent.setup()
    render(<ThemeButton />)
    await user.tab()
    await user.keyboard('{Enter}')
    expect(getSettings().theme).toBe('dark')
    await user.keyboard(' ')
    expect(getSettings().theme).toBe('auto')
  })

  it('anuncia o novo tema numa região viva', async () => {
    const user = userEvent.setup()
    render(<ThemeButton />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toHaveTextContent('Tema escuro')
  })

  it('troca pelo startThemeTransition a partir do centro do botão', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(transition, 'startThemeTransition')
    render(<ThemeButton />)
    const button = screen.getByRole('button')
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 40,
      width: 120,
      height: 48,
      right: 220,
      bottom: 88,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    })
    await user.click(button)
    expect(spy).toHaveBeenCalledWith(expect.any(Function), { x: 160, y: 64 })
  })

  it('o ícone do tema novo monta com a classe de animação', async () => {
    const user = userEvent.setup()
    const { container } = render(<ThemeButton />)
    const before = container.querySelector('svg')
    await user.click(screen.getByRole('button'))
    const after = container.querySelector('svg')
    expect(after).not.toBe(before)
    expect(after?.getAttribute('class')).toMatch(/icon/)
    expect(after).toHaveAttribute('aria-hidden', 'true')
  })

  // Largura fixa (feature 024): os três rótulos ficam na mesma célula e só o atual aparece, então o
  // botão tem sempre a largura do mais largo. O CSS esconde os outros por `data-active`.
  it('reserva o espaço dos três rótulos e marca só o do tema atual', async () => {
    const user = userEvent.setup()
    const { container } = render(<ThemeButton />)
    const labels = () => [...container.querySelectorAll('button [data-label]')]
    expect(labels().map((label) => label.textContent)).toEqual(['Automático', 'Claro', 'Escuro'])
    const active = () =>
      labels()
        .filter((label) => label.hasAttribute('data-active'))
        .map((label) => label.textContent)
    expect(active()).toEqual(['Claro'])
    await user.click(screen.getByRole('button'))
    expect(active()).toEqual(['Escuro'])
    // O nome acessível vem do aria-label: os rótulos repetidos ficam fora da árvore de acessibilidade.
    expect(container.querySelector('button [data-label]')?.parentElement).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByRole('button')).toHaveAccessibleName('Tema: escuro. Mudar para automático')
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<ThemeButton />)
    await expectNoA11yViolations(container)
  })
})
