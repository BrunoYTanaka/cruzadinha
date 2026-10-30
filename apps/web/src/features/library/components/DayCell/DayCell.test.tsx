import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CalendarDay } from '../../helpers/calendar'
import { expectNoA11yViolations } from '../../../../test/axe'
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

describe('DayCell com filtro de status (feature 053)', () => {
  const withFilter = (filter: 'all' | 'completed' | 'not_started') =>
    render(
      <MemoryRouter>
        <DayCell day={day} month={10} source="oglobo" filter={filter} />
      </MemoryRouter>,
    )

  it('dia fora do filtro vira texto sem ação, fora da tabulação e dito "fora do filtro"', async () => {
    const { container } = withFilter('completed')
    const dimmed = screen.getByRole('img', { name: '13 de outubro, não iniciado, fora do filtro' })
    expect(dimmed.closest('a')).toBeNull()
    expect(dimmed).not.toHaveAttribute('tabindex')
    expect(container.querySelector('a, button, [tabindex]')).toBeNull()
    await expectNoA11yViolations(container)
  })

  it('dia dentro do filtro continua link', () => {
    withFilter('not_started')
    expect(screen.getByRole('link', { name: '13 de outubro, não iniciado' })).toBeInTheDocument()
  })

  it('"all" não muda nada', () => {
    withFilter('all')
    expect(screen.getByRole('link', { name: '13 de outubro, não iniciado' })).toBeInTheDocument()
  })
})
