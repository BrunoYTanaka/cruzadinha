import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { ResizeHandle, type ResizeHandleProps } from './ResizeHandle'

function setup(overrides: Partial<ResizeHandleProps> = {}) {
  const props: ResizeHandleProps = {
    value: 50,
    min: 30,
    max: 110,
    step: 10,
    label: 'Tamanho do tabuleiro',
    valueText: (value) => `Tamanho do tabuleiro ${value} de 110`,
    fromDrag: ({ startValue, dx }) => startValue + dx,
    onChange: vi.fn(),
    onCommit: vi.fn(),
    onReset: vi.fn(),
    variant: 'corner',
    ...overrides,
  }
  const view = render(<ResizeHandle {...props} />)
  return { props, ...view }
}

describe('ResizeHandle', () => {
  it('é um slider com nome, limites e valor anunciado', () => {
    setup()
    const handle = screen.getByRole('slider', { name: 'Tamanho do tabuleiro' })
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
    expect(handle).toHaveAttribute('aria-valuemin', '30')
    expect(handle).toHaveAttribute('aria-valuemax', '110')
    expect(handle).toHaveAttribute('aria-valuenow', '50')
    expect(handle).toHaveAttribute('aria-valuetext', 'Tamanho do tabuleiro 50 de 110')
  })

  it('setas, Home e End mudam e gravam o valor, sempre dentro dos limites', async () => {
    const user = userEvent.setup()
    const { props, rerender } = setup()
    const handle = screen.getByRole('slider')
    handle.focus()
    await user.keyboard('{ArrowRight}')
    expect(props.onChange).toHaveBeenLastCalledWith(60)
    expect(props.onCommit).toHaveBeenLastCalledWith(60)
    await user.keyboard('{ArrowUp}')
    expect(props.onCommit).toHaveBeenLastCalledWith(60)
    await user.keyboard('{ArrowLeft}')
    expect(props.onCommit).toHaveBeenLastCalledWith(40)
    await user.keyboard('{ArrowDown}')
    expect(props.onCommit).toHaveBeenLastCalledWith(40)
    await user.keyboard('{Home}')
    expect(props.onCommit).toHaveBeenLastCalledWith(30)
    await user.keyboard('{End}')
    expect(props.onCommit).toHaveBeenLastCalledWith(110)
    rerender(<ResizeHandle {...props} value={105} />)
    await user.keyboard('{ArrowRight}')
    expect(props.onCommit).toHaveBeenLastCalledWith(110)
  })

  it('letras não fazem nada', async () => {
    const user = userEvent.setup()
    const { props } = setup()
    screen.getByRole('slider').focus()
    await user.keyboard('a')
    expect(props.onChange).not.toHaveBeenCalled()
    expect(props.onCommit).not.toHaveBeenCalled()
  })

  it('arrastar muda o valor e grava uma vez ao soltar', () => {
    const fromDrag = vi.fn(
      ({ startValue, dx }: { startValue: number; dx: number }) => startValue + dx,
    )
    const { props } = setup({ fromDrag })
    const handle = screen.getByRole('slider')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 120, clientY: 110 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500, clientY: 110 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 500, clientY: 110 })
    expect(fromDrag).toHaveBeenCalledWith({ startValue: 50, dx: 20, dy: 10 })
    expect(props.onChange).toHaveBeenLastCalledWith(110)
    expect(props.onCommit).toHaveBeenCalledTimes(1)
    expect(props.onCommit).toHaveBeenCalledWith(110)
  })

  it('arraste cancelado ou sem captura grava o último valor válido', () => {
    const { props } = setup()
    const handle = screen.getByRole('slider')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 85, clientY: 0 })
    fireEvent.pointerCancel(handle, { pointerId: 1 })
    expect(props.onCommit).toHaveBeenCalledWith(35)

    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 100, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 0, clientY: 0 })
    fireEvent.lostPointerCapture(handle, { pointerId: 2 })
    expect(props.onCommit).toHaveBeenLastCalledWith(30)
    expect(props.onCommit).toHaveBeenCalledTimes(2)
  })

  it('o botão secundário não arrasta', () => {
    const { props } = setup()
    const handle = screen.getByRole('slider')
    fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientX: 100, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 140, clientY: 0 })
    fireEvent.pointerUp(handle, { pointerId: 1 })
    expect(props.onChange).not.toHaveBeenCalled()
    expect(props.onCommit).not.toHaveBeenCalled()
  })

  it('clique duplo volta ao padrão', () => {
    const { props } = setup()
    fireEvent.doubleClick(screen.getByRole('slider'))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it('as variantes têm desenhos diferentes', () => {
    const { rerender, props } = setup()
    const corner = screen.getByRole('slider').className
    rerender(<ResizeHandle {...props} variant="edge" />)
    expect(screen.getByRole('slider').className).not.toBe(corner)
  })

  it('decorativa: some da acessibilidade e do Tab, mas ainda arrasta', async () => {
    const user = userEvent.setup()
    const { props, container } = setup({ decorative: true })
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    const handle = container.firstElementChild as HTMLElement
    expect(handle).toHaveAttribute('aria-hidden', 'true')
    expect(handle).toHaveAttribute('tabindex', '-1')
    expect(handle).not.toHaveAttribute('aria-valuenow')
    handle.focus()
    await user.keyboard('{ArrowRight}')
    expect(props.onCommit).not.toHaveBeenCalled()
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 0 })
    fireEvent.pointerUp(handle, { pointerId: 1 })
    expect(props.onCommit).toHaveBeenCalledWith(60)
  })

  it('não tem violações de acessibilidade, com uma alça normal e uma decorativa', async () => {
    const props: ResizeHandleProps = {
      value: 1000,
      min: 720,
      max: 1600,
      step: 40,
      label: 'Largura do calendário',
      valueText: (value) => `Largura do calendário ${value} de 1600`,
      fromDrag: ({ startValue }) => startValue,
      onChange: () => {},
      onCommit: () => {},
      onReset: () => {},
      variant: 'edge',
    }
    const { container } = render(
      <div>
        <ResizeHandle {...props} />
        <ResizeHandle {...props} variant="corner" decorative />
      </div>,
    )
    await expectNoA11yViolations(container)
  })
})
