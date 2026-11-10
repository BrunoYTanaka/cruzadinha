import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SaveState } from '../../../services/save-queue'
import { SaveStatus } from './SaveStatus'

function announcement(container: HTMLElement) {
  return container.querySelector('[aria-live="polite"]')?.textContent ?? ''
}

describe('SaveStatus', () => {
  // Feature 017: o salvamento normal não aparece na tela, para a faixa de ferramentas não pular.
  it.each<SaveState>(['saved', 'saving'])(
    'em "%s" não mostra texto nem deixa elemento',
    (state) => {
      const { container } = render(<SaveStatus state={state} />)
      expect(container.children).toHaveLength(1)
      expect(container.firstElementChild).toHaveAttribute('aria-live', 'polite')
      expect(announcement(container)).toBe('')
      expect(screen.queryByText('Salvo')).toBeNull()
      expect(screen.queryByText('Salvando…')).toBeNull()
    },
  )

  it.each<[SaveState, string, boolean]>([
    ['offline', 'Sem conexão, tentando de novo', true],
    ['completed-elsewhere', 'Concluída em outro aparelho', false],
    ['local-only', 'Não salvo: vale só nesta aba', true],
  ])('mostra o aviso de "%s" por texto visível', (state, text, warn) => {
    render(<SaveStatus state={state} />)
    const visible = screen.getByText(text, { selector: 'span:not([aria-live])' })
    expect(visible).toBeVisible()
    expect(visible.closest('[aria-live]')).toBeNull()
    if (warn) expect(visible.className).toMatch(/warn/)
    else expect(visible.className).not.toMatch(/warn/)
  })

  it('não repete a sessão expirada: a faixa de aviso já diz', () => {
    render(<SaveStatus state="session-expired" />)
    expect(screen.queryByText('Sessão expirada')).toBeNull()
  })

  it('tem uma única região viva', () => {
    const { container } = render(<SaveStatus state="offline" />)
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
  })

  it('não anuncia nada a cada salvamento', () => {
    const { container, rerender } = render(<SaveStatus state="saved" />)
    for (const state of ['saving', 'saved', 'saving', 'saved'] as const) {
      rerender(<SaveStatus state={state} />)
      expect(announcement(container)).toBe('')
    }
  })

  it('anuncia a queda para sem conexão e a volta, sem mostrar "Salvo"', () => {
    const { container, rerender } = render(<SaveStatus state="saved" />)
    rerender(<SaveStatus state="saving" />)
    rerender(<SaveStatus state="offline" />)
    expect(announcement(container)).toBe('Sem conexão, tentando de novo')
    rerender(<SaveStatus state="saving" />) // tentando de novo: ainda não voltou
    expect(announcement(container)).toBe('Sem conexão, tentando de novo')
    expect(
      screen.queryByText('Sem conexão, tentando de novo', { selector: 'span:not([aria-live])' }),
    ).toBeNull()
    rerender(<SaveStatus state="saved" />)
    expect(announcement(container)).toBe('Conexão restabelecida')
    expect(screen.queryByText('Salvo')).toBeNull()
  })

  it('sessão expirada e conclusão em outro aparelho limpam o anúncio', () => {
    const { container, rerender } = render(<SaveStatus state="offline" />)
    rerender(<SaveStatus state="session-expired" />)
    expect(announcement(container)).toBe('')
    rerender(<SaveStatus state="completed-elsewhere" />)
    expect(announcement(container)).toBe('')
  })
})
