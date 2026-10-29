import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyOutboxEvent } from '../../services/outbox/outbox'
import { PendingOwnerNotice } from './PendingOwnerNotice'

const body = {
  cells: [['A', null]],
  elapsedMs: 1000,
  status: 'in_progress' as const,
  savedAt: '2026-10-16T12:00:00.000Z',
}
const view = (guest: boolean) =>
  render(
    <MemoryRouter>
      <PendingOwnerNotice guest={guest} />
    </MemoryRouter>,
  )

beforeEach(() => localStorage.clear())

describe('PendingOwnerNotice', () => {
  it('não mostra nada sem pendência', () => {
    view(true)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('visitante com pendência não vê aviso', () => {
    applyOutboxEvent('u1', 'p1', { type: 'save', body })
    view(true)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('a conta vê o aviso de descarte uma vez e pode dispensá-lo', async () => {
    localStorage.setItem('cruzadinha:outbox-discarded', '1')
    view(false)
    expect(screen.getByRole('status')).toHaveTextContent('foi descartado')
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(localStorage.getItem('cruzadinha:outbox-discarded')).toBeNull()
  })
})
