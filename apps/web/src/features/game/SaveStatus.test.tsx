import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SaveState } from './save-queue'
import { SaveStatus } from './SaveStatus'

function announcement(container: HTMLElement) {
  return container.querySelector('[aria-live="polite"]')?.textContent ?? ''
}

describe('SaveStatus', () => {
  it.each<[SaveState, string]>([
    ['saved', 'Salvo'],
    ['saving', 'Salvando…'],
    ['offline', 'Sem conexão, tentando de novo'],
    ['session-expired', 'Sessão expirada'],
    ['completed-elsewhere', 'Concluída em outro aparelho'],
  ])('mostra "%s" por texto visível', (state, text) => {
    render(<SaveStatus state={state} />)
    expect(screen.getByText(text, { selector: 'span:not([aria-live])' })).toBeVisible()
  })

  it('o texto visível não é uma região viva', () => {
    const { container } = render(<SaveStatus state="saving" />)
    const visible = screen.getByText('Salvando…')
    expect(visible.closest('[aria-live]')).toBeNull()
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
  })

  it('não anuncia "Salvando…" nem "Salvo" a cada salvamento', () => {
    const { container, rerender } = render(<SaveStatus state="saved" />)
    for (const state of ['saving', 'saved', 'saving', 'saved'] as const) {
      rerender(<SaveStatus state={state} />)
      expect(announcement(container)).toBe('')
    }
  })

  it('anuncia a queda para sem conexão e a volta', () => {
    const { container, rerender } = render(<SaveStatus state="saved" />)
    rerender(<SaveStatus state="saving" />)
    rerender(<SaveStatus state="offline" />)
    expect(announcement(container)).toBe('Sem conexão, tentando de novo')
    rerender(<SaveStatus state="saving" />) // tentando de novo: ainda não voltou
    expect(announcement(container)).toBe('Sem conexão, tentando de novo')
    rerender(<SaveStatus state="saved" />)
    expect(announcement(container)).toBe('Conexão restabelecida')
  })

  it('sessão expirada e conclusão em outro aparelho limpam o anúncio', () => {
    const { container, rerender } = render(<SaveStatus state="offline" />)
    rerender(<SaveStatus state="session-expired" />)
    expect(announcement(container)).toBe('')
    rerender(<SaveStatus state="completed-elsewhere" />)
    expect(announcement(container)).toBe('')
  })
})
