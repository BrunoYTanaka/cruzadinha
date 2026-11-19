import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { Tabs } from './Tabs'

type Id = 'a' | 'b' | 'c'

const items = [
  { id: 'a', name: 'Alfa', caption: 'primeira' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gama', caption: 'terceira' },
] as const

function Harness({ onChange, start = 'a' }: { onChange: (id: Id) => void; start?: Id }) {
  const [value, setValue] = useState<Id>(start)
  return (
    <>
      <Tabs<Id>
        label="Seções"
        tabs={items}
        value={value}
        onChange={(id) => {
          onChange(id)
          setValue(id)
        }}
        tabId={(id) => `t-${id}`}
        panelId={(id) => `p-${id}`}
      />
      {items.map((item) => (
        <div
          key={item.id}
          id={`p-${item.id}`}
          role="tabpanel"
          aria-labelledby={`t-${item.id}`}
          hidden={item.id !== value}
        >
          {item.name}
        </div>
      ))}
    </>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Tabs', () => {
  it('uma aba por item, com legenda, só a escolhida no Tab', async () => {
    const { container } = render(<Harness onChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Seções' })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole('tab')
    expect(first).toHaveAccessibleName('Alfa primeira')
    expect(first).toHaveAttribute('id', 't-a')
    expect(first).toHaveAttribute('aria-controls', 'p-a')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(first).toHaveAttribute('tabindex', '0')
    expect(second).toHaveAccessibleName('Beta')
    expect(second).toHaveAttribute('aria-selected', 'false')
    expect(second).toHaveAttribute('tabindex', '-1')
    await expectNoA11yViolations(container)
  })

  it('setas com volta, Home e End trocam e focam; clique escolhe', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('tab', { name: /^Alfa/ })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('c')
    expect(screen.getByRole('tab', { name: /^Gama/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('a')
    await user.keyboard('{End}')
    expect(onChange).toHaveBeenLastCalledWith('c')
    await user.keyboard('{Home}')
    expect(onChange).toHaveBeenLastCalledWith('a')
    await user.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(onChange).toHaveBeenLastCalledWith('b')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ao montar, rola a aba escolhida para a vista', () => {
    const scroll = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    })
    render(<Harness onChange={vi.fn()} start="c" />)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole('tab', { name: /^Gama/ }))
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })
})
