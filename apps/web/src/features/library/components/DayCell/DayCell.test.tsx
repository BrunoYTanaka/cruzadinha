import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
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

describe('DayCell em modo de seleção (feature 058)', () => {
  const pick = (
    state: CalendarDay['state'],
    onSelect = vi.fn(),
    selectedId: string | null = null,
  ) => {
    const result = render(
      <MemoryRouter>
        <DayCell
          day={{ ...day, state }}
          month={10}
          source="oglobo"
          selection={{ selectedId, onSelect }}
        />
      </MemoryRouter>,
    )
    return { ...result, onSelect }
  }

  it('dia guardado vira botão e escolhe a cruzada', async () => {
    const { onSelect } = pick({ kind: 'not_started', puzzleId: 'p-13' })
    await userEvent.click(screen.getByRole('button', { name: '13 de outubro, não iniciado' }))
    expect(onSelect).toHaveBeenCalledWith({
      puzzleId: 'p-13',
      date: '2026-10-13',
      source: 'oglobo',
      finishedMs: null,
    })
  })

  it('dia concluído mostra o tempo e o aviso "você já fez esta"', async () => {
    const { container } = pick({ kind: 'completed', puzzleId: 'p-13', finishedMs: 312_000 })
    const button = screen.getByRole('button', {
      name: '13 de outubro, concluído em 5 minutos e 12 segundos, você já fez esta',
    })
    expect(button).toHaveTextContent('✓ 05:12 · já fez')
    await expectNoA11yViolations(container)
  })

  it('marca o dia escolhido com aria-pressed', () => {
    pick({ kind: 'in_progress', puzzleId: 'p-13' }, vi.fn(), 'p-13')
    expect(screen.getByRole('button', { name: /13 de outubro/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it.each([
    [{ kind: 'fetchable' } as const, 'não guardado, não pode ser escolhido'],
    [{ kind: 'none' } as const, 'sem cruzada neste dia'],
    [{ kind: 'future' } as const, 'indisponível'],
  ])('dia %j não é botão nem link', (state, spoken) => {
    const { container } = pick(state)
    expect(screen.getByRole('img', { name: `13 de outubro, ${spoken}` })).toBeInTheDocument()
    expect(container.querySelector('a, button')).toBeNull()
  })
})
