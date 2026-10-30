import type { Stats } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { StatsView } from './StatsView'

const stats: Stats = {
  streak: { current: 3, longest: 5 },
  total: 4,
  averageMs: 90_000,
  bySource: [
    { source: 'oglobo', total: 4, averageMs: 90_000, bestMs: 60_000 },
    { source: 'clube', total: 0, averageMs: null, bestMs: null },
  ],
}

describe('StatsView', () => {
  it('mostra sequência, total, média e a tabela por fonte', () => {
    render(<StatsView stats={stats} guest={false} />)
    expect(screen.getByText('3 dias')).toBeInTheDocument()
    expect(screen.getByText('5 dias')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /O Globo\s*4\s*01:30\s*01:00/ })).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByText(/só para este aparelho/)).not.toBeInTheDocument()
  })

  it('convida a jogar e usa singular quando não há conclusões', () => {
    render(
      <StatsView
        stats={{ ...stats, streak: { current: 1, longest: 1 }, total: 0, averageMs: null }}
        guest
      />,
    )
    expect(screen.getByText(/Nenhuma cruzada concluída/)).toBeInTheDocument()
    expect(screen.getAllByText('1 dia')).toHaveLength(2)
    expect(screen.getByText(/só para este aparelho/)).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<StatsView stats={stats} guest />)
    await expectNoA11yViolations(container)
  })
})
