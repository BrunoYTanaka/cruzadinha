import type { PuzzleSourceId } from '@cruzadinha/shared'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { SourceTabs, type SourceTab } from './SourceTabs'

const tabs: SourceTab[] = [
  { source: 'oglobo', name: 'O Globo', count: 5 },
  { source: 'cruzadaonline', name: 'Cruzada Online', count: null },
]

// Guarda a escolha como a página faz, para conferir foco e seleção juntos.
function Harness({ onChange }: { onChange: (source: PuzzleSourceId) => void }) {
  const [value, setValue] = useState<PuzzleSourceId>('oglobo')
  return (
    <>
      <SourceTabs
        value={value}
        tabs={tabs}
        onChange={(source) => {
          onChange(source)
          setValue(source)
        }}
      />
      <section id="source-panel" role="tabpanel" aria-labelledby={`source-tab-${value}`}>
        Calendário
      </section>
    </>
  )
}

describe('SourceTabs', () => {
  it('uma aba por fonte, na ordem recebida, só a ativa no Tab', async () => {
    const { container } = render(<Harness onChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Fonte do calendário' })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole('tab')
    expect(first).toHaveAccessibleName('O Globo 5 concluídas')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(first).toHaveAttribute('tabindex', '0')
    expect(first).toHaveAttribute('aria-controls', 'source-panel')
    // Sem contagem (carregando ou com erro), só o nome.
    expect(second).toHaveAccessibleName('Cruzada Online')
    expect(second).toHaveAttribute('aria-selected', 'false')
    expect(second).toHaveAttribute('tabindex', '-1')
    await expectNoA11yViolations(container)
  })

  it('clique escolhe a aba', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Cruzada Online' }))
    expect(onChange).toHaveBeenCalledWith('cruzadaonline')
    expect(screen.getByRole('tab', { name: 'Cruzada Online' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('setas trocam de aba com volta nas pontas; Home e End vão às pontas', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('tab', { name: /^O Globo/ })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('cruzadaonline')
    expect(screen.getByRole('tab', { name: 'Cruzada Online' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('oglobo')
    expect(screen.getByRole('tab', { name: /^O Globo/ })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('cruzadaonline')

    await user.keyboard('{Home}')
    expect(onChange).toHaveBeenLastCalledWith('oglobo')
    await user.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith('cruzadaonline')
    expect(screen.getByRole('tab', { name: 'Cruzada Online' })).toHaveFocus()
  })
})
