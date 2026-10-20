import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { SaveState } from './save-queue'
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
    ['session-expired', 'Sessão expirada', false],
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

describe('SaveStatus do visitante (features 013 e 017)', () => {
  const loginTo = '/login?next=%2Fjogo%2Fabc'

  function renderGuest(state: SaveState) {
    return render(
      <MemoryRouter>
        <SaveStatus state={state} guest={{ loginTo }} />
      </MemoryRouter>,
    )
  }

  it.each<SaveState>(['saved', 'saving'])(
    'em "%s" diz que o progresso fica só neste aparelho e oferece entrar',
    (state) => {
      const { container } = renderGuest(state)
      expect(screen.getByText('Progresso só neste aparelho')).toBeVisible()
      expect(screen.queryByText('Salvo neste aparelho')).toBeNull()
      expect(screen.queryByText('Salvando…')).toBeNull()
      expect(screen.getByRole('link', { name: 'Entrar para salvar na sua conta' })).toHaveAttribute(
        'href',
        loginTo,
      )
      expect(announcement(container)).toBe('Seu progresso fica salvo só neste aparelho.')
    },
  )

  it('o texto fixo não muda entre salvamentos', () => {
    const { rerender } = renderGuest('saved')
    for (const state of ['saving', 'saved'] as const) {
      rerender(
        <MemoryRouter>
          <SaveStatus state={state} guest={{ loginTo }} />
        </MemoryRouter>,
      )
      expect(screen.getByText('Progresso só neste aparelho')).toBeVisible()
    }
  })

  it('sem armazenamento, o aviso ocupa o lugar do texto fixo e o link continua', () => {
    const { container, rerender } = renderGuest('saved')
    rerender(
      <MemoryRouter>
        <SaveStatus state="local-only" guest={{ loginTo }} />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('Não salvo: vale só nesta aba', { selector: 'span:not([aria-live])' }),
    ).toBeVisible()
    expect(screen.queryByText('Progresso só neste aparelho')).toBeNull()
    expect(screen.getByRole('link', { name: 'Entrar para salvar na sua conta' })).toBeVisible()
    expect(announcement(container)).toBe('Não salvo: vale só nesta aba')
  })
})
