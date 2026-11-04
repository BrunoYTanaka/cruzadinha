import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { SourceBar } from './SourceBar'

const tabs = [
  { source: 'oglobo', name: 'O Globo', count: 1 },
  { source: 'cruzadaonline', name: 'Cruzada Online', count: 0 },
] as const

function setup() {
  const onChange = vi.fn()
  const onJumpDate = vi.fn()
  const view = render(
    <>
      <SourceBar
        value="oglobo"
        tabs={tabs}
        onChange={onChange}
        today="2026-10-14"
        month={{ year: 2026, month: 10 }}
        onJumpMonth={vi.fn()}
        onJumpDate={onJumpDate}
      />
      <div id="source-panel" role="tabpanel" aria-label="Calendário" />
    </>,
  )
  return { ...view, onChange, onJumpDate, user: userEvent.setup() }
}

describe('SourceBar (feature 061)', () => {
  it('mostra as abas e, depois delas, o botão do filtro de data fechado', () => {
    setup()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    const button = screen.getByRole('button', { name: 'Ir para uma data' })
    const tablist = screen.getByRole('tablist', { name: 'Fonte do calendário' })
    expect(tablist.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('as teclas das abas seguem valendo e o painel abre sem tirar as abas', async () => {
    const { user, onChange } = setup()
    screen.getByRole('tab', { name: /^O Globo/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('cruzadaonline')
    await user.click(screen.getByRole('button', { name: 'Ir para uma data' }))
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByLabelText('Data')).toBeInTheDocument()
  })

  it('a borda de baixo é da linha, não das abas', () => {
    expect(readCss('SourceBar.module.css')).toMatch(/\.bar\s*{[^}]*border-bottom/)
    expect(readCss('SourceTabs.module.css')).not.toMatch(/\.tabs\s*{[^}]*border-bottom/)
  })

  it('não tem violações de acessibilidade, fechado nem aberto', async () => {
    const { container, user } = setup()
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Ir para uma data' }))
    await expectNoA11yViolations(container)
  })
})
