import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CalendarDay } from '../../helpers/calendar'
import { DayCell } from './DayCell'

const day: CalendarDay = {
  date: '2026-10-13',
  day: 13,
  isToday: false,
  state: { kind: 'not_started', puzzleId: 'p-13' },
}
const view = (stored?: ReadonlySet<string>) =>
  render(
    <MemoryRouter>
      <DayCell day={day} month={10} source="oglobo" stored={stored} />
    </MemoryRouter>,
  )

describe('DayCell guardada para jogar sem rede (feature 041)', () => {
  it('diz "disponível sem rede" no nome acessível quando a cruzada está guardada', () => {
    view(new Set(['p-13']))
    expect(
      screen.getByRole('link', { name: '13 de outubro, não iniciado, disponível sem rede' }),
    ).toBeInTheDocument()
  })

  it('não diz nada quando não está guardada', () => {
    view(new Set())
    expect(screen.getByRole('link', { name: '13 de outubro, não iniciado' })).toBeInTheDocument()
  })
})
