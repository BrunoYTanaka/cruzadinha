import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { readCss } from '../../../../test/css-file'
import { JumpToDate } from './JumpToDate'

const today = '2026-10-14'

function setup() {
  const onJumpMonth = vi.fn()
  const onJumpDate = vi.fn()
  const view = render(
    <JumpToDate
      today={today}
      month={{ year: 2026, month: 10 }}
      onJumpMonth={onJumpMonth}
      onJumpDate={onJumpDate}
    />,
  )
  return { onJumpMonth, onJumpDate, ...view, user: userEvent.setup() }
}

// O campo nativo nunca entrega 31/02 (o valor vira vazio); `invalid` é coberto em jump.test.ts.
describe('JumpToDate (feature 054)', () => {
  it('mostra o mês exibido e oferece só os 13 meses navegáveis', () => {
    setup()
    const select = screen.getByRole('combobox', { name: 'Mês' })
    expect(select).toHaveValue('2026-10')
    expect(screen.getAllByRole('option')).toHaveLength(13)
  })

  it('escolher outro mês chama o salto uma vez', async () => {
    const { user, onJumpMonth } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), '2026-04')
    expect(onJumpMonth).toHaveBeenCalledOnce()
    expect(onJumpMonth).toHaveBeenCalledWith({ year: 2026, month: 4 })
  })

  it('uma data válida chama o salto com a data e o mês', async () => {
    const { user, onJumpDate } = setup()
    await user.type(screen.getByLabelText('Data'), '2026-07-03')
    expect(onJumpDate).toHaveBeenLastCalledWith('2026-07-03', { year: 2026, month: 7 })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it.each([
    ['2026-10-15', 'Esta data ainda não chegou. Use uma data de outubro de 2025 até hoje.'],
    ['2025-09-30', 'Só há datas de outubro de 2025 até hoje.'],
  ])('a data %s mostra o aviso e não salta', async (value, message) => {
    const { onJumpDate, onJumpMonth } = setup()
    const input = screen.getByLabelText('Data')
    // Digitação livre: o jsdom aceita valores fora de min/max.
    fireEvent.change(input, { target: { value } })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(onJumpDate).not.toHaveBeenCalled()
    expect(onJumpMonth).not.toHaveBeenCalled()
  })

  it('o aviso some ao corrigir a data, ao escolher um mês e ao limpar o campo', async () => {
    const { user, onJumpDate } = setup()
    const input = screen.getByLabelText('Data')
    fireEvent.change(input, { target: { value: '2026-10-15' } })
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement()
    fireEvent.change(input, { target: { value: '2026-09-01' } })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    expect(onJumpDate).toHaveBeenCalledOnce()
    fireEvent.change(input, { target: { value: '2026-10-15' } })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), '2026-04')
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    fireEvent.change(input, { target: { value: '2026-10-15' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('não tem violações de acessibilidade, nem com o aviso', async () => {
    const { container } = setup()
    await expectNoA11yViolations(container)
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-15' } })
    await expectNoA11yViolations(container)
  })

  it('a linha do aviso tem altura mínima fixa (a grade não desloca)', () => {
    expect(readCss('JumpToDate.module.css')).toMatch(/\.error\s*{[^}]*min-height:\s*2\.8em/)
  })
})
