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
  const user = userEvent.setup()
  const toggle = () => screen.getByRole('button', { name: 'Ir para uma data' })
  return { onJumpMonth, onJumpDate, ...view, user, toggle, openPanel: () => user.click(toggle()) }
}

async function setupOpen() {
  const result = setup()
  await result.openPanel()
  return result
}

// O campo nativo nunca entrega 31/02 (o valor vira vazio); `invalid` é coberto em jump.test.ts.
describe('JumpToDate (feature 054)', () => {
  it('mostra o mês exibido e oferece só os 13 meses navegáveis', async () => {
    await setupOpen()
    const select = screen.getByRole('combobox', { name: 'Mês' })
    expect(select).toHaveValue('2026-10')
    expect(screen.getAllByRole('option')).toHaveLength(13)
  })

  it('escolher outro mês chama o salto uma vez', async () => {
    const { user, onJumpMonth } = await setupOpen()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), '2026-04')
    expect(onJumpMonth).toHaveBeenCalledOnce()
    expect(onJumpMonth).toHaveBeenCalledWith({ year: 2026, month: 4 })
  })

  it('uma data válida chama o salto com a data e o mês', async () => {
    const { user, onJumpDate } = await setupOpen()
    await user.type(screen.getByLabelText('Data'), '2026-07-03')
    expect(onJumpDate).toHaveBeenLastCalledWith('2026-07-03', { year: 2026, month: 7 })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it.each([
    ['2026-10-15', 'Esta data ainda não chegou. Use uma data de outubro de 2025 até hoje.'],
    ['2025-09-30', 'Só há datas de outubro de 2025 até hoje.'],
  ])('a data %s mostra o aviso e não salta', async (value, message) => {
    const { onJumpDate, onJumpMonth } = await setupOpen()
    const input = screen.getByLabelText('Data')
    // Digitação livre: o jsdom aceita valores fora de min/max.
    fireEvent.change(input, { target: { value } })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(onJumpDate).not.toHaveBeenCalled()
    expect(onJumpMonth).not.toHaveBeenCalled()
  })

  it('o aviso some ao corrigir a data, ao escolher um mês e ao limpar o campo', async () => {
    const { user, onJumpDate } = await setupOpen()
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

  it('não tem violações de acessibilidade, fechado, aberto nem com o aviso', async () => {
    const { container, openPanel } = setup()
    await expectNoA11yViolations(container)
    await openPanel()
    await expectNoA11yViolations(container)
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-15' } })
    await expectNoA11yViolations(container)
  })

  it('começa fechado: só o botão, com nome, sem campos e sem aria-controls', () => {
    const { toggle } = setup()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).not.toHaveAttribute('aria-controls')
    expect(toggle()).not.toHaveAttribute('aria-haspopup')
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Mês' })).not.toBeInTheDocument()
  })

  it('abre ao clicar, leva o foco ao mês e liga o botão ao painel', async () => {
    const { toggle, openPanel } = setup()
    await openPanel()
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('group', { name: 'Ir para uma data' })
    expect(toggle()).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveFocus()
  })

  it('fecha pelo botão, por Esc (foco volta ao botão) e ao tocar fora', async () => {
    const { user, toggle, openPanel } = setup()
    await openPanel()
    await user.click(toggle())
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument()

    await openPanel()
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument()
    expect(toggle()).toHaveFocus()

    await openPanel()
    await user.click(document.body)
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument()
  })

  it('tocar dentro do painel não fecha; Esc não sobe para quem está acima', async () => {
    const { user, openPanel } = setup()
    const onParentKey = vi.fn()
    document.addEventListener('keydown', onParentKey)
    await openPanel()
    await user.click(screen.getByText('Mês'))
    expect(screen.getByLabelText('Data')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onParentKey).not.toHaveBeenCalled()
    document.removeEventListener('keydown', onParentKey)
  })

  it('Tab sai do painel sem fechá-lo', async () => {
    const { user, openPanel } = setup()
    await openPanel()
    await user.tab()
    await user.tab()
    expect(screen.getByLabelText('Data')).toBeInTheDocument()
  })

  it('o aviso some ao fechar: reabrir não mostra erro antigo (FR-016)', async () => {
    const { user, toggle } = await setupOpen()
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-15' } })
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement()
    await user.click(toggle())
    await user.click(toggle())
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('o botão mede 46 px e o painel flutua, com pelo menos 300 px e campos de 44 px', () => {
    const css = readCss('JumpToDate.module.css')
    expect(css).toMatch(/\.button\s*{[^}]*width:\s*46px[^}]*height:\s*46px/)
    expect(css).toMatch(/\.icon\s*{[^}]*width:\s*24px/)
    expect(css).toMatch(/\.panel\s*{[^}]*position:\s*absolute/)
    expect(css).toMatch(/\.panel\s*{[^}]*min-width:\s*min\(300px/)
    expect(css).toMatch(/\.control\s*{[^}]*min-height:\s*var\(--tap\)/)
  })

  it('a linha do aviso tem altura mínima fixa (a grade não desloca)', () => {
    expect(readCss('JumpToDate.module.css')).toMatch(/\.error\s*{[^}]*min-height:\s*2\.8em/)
  })
})
