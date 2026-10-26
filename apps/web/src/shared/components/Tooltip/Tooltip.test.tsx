import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../test/axe'
import { Tooltip } from './Tooltip'

function setup() {
  return render(
    <Tooltip label="Configurações">
      <button type="button" aria-label="Configurações">
        ⚙
      </button>
    </Tooltip>,
  )
}

const tip = () => screen.queryByText('Configurações', { selector: '[data-tooltip]' })

describe('Tooltip', () => {
  it('aparece no foco do alvo e some ao sair', async () => {
    const user = userEvent.setup()
    setup()
    expect(tip()).toBeNull()
    await user.tab()
    expect(tip()).toBeInTheDocument()
    await user.tab()
    expect(tip()).toBeNull()
  })

  it('aparece com o mouse e some ao sair', () => {
    setup()
    const target = screen.getByRole('button')
    fireEvent.pointerEnter(target.parentElement!, { pointerType: 'mouse' })
    expect(tip()).toBeInTheDocument()
    fireEvent.pointerLeave(target.parentElement!, { pointerType: 'mouse' })
    expect(tip()).toBeNull()
  })

  it('não aparece com toque', () => {
    setup()
    fireEvent.pointerEnter(screen.getByRole('button').parentElement!, { pointerType: 'touch' })
    expect(tip()).toBeNull()
  })

  it('Esc fecha sem impedir que o evento chegue ao documento', async () => {
    const user = userEvent.setup()
    const onDocumentKey = vi.fn()
    document.addEventListener('keydown', onDocumentKey)
    setup()
    await user.tab()
    expect(tip()).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(tip()).toBeNull()
    expect(onDocumentKey).toHaveBeenCalled()
    document.removeEventListener('keydown', onDocumentKey)
  })

  it('é escondido do leitor de tela (o nome já está no alvo)', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await user.tab()
    expect(tip()).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByRole('button', { name: 'Configurações' })).toHaveLength(1)
    await expectNoA11yViolations(container)
  })

  describe('posição dentro da janela (feature 024)', () => {
    const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

    afterEach(() => {
      vi.restoreAllMocks()
      if (clientWidth) Object.defineProperty(Element.prototype, 'clientWidth', clientWidth)
    })

    // O jsdom não faz layout: a caixa do balão e a largura da janela são simuladas.
    function mockLayout(box: { left: number; width: number }, viewport: number) {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
      ) {
        const { left, width } = this.hasAttribute('data-tooltip') ? box : { left: 0, width: 0 }
        return {
          left,
          width,
          right: left + width,
          top: 0,
          bottom: 0,
          height: 0,
          x: left,
          y: 0,
        } as DOMRect
      })
      Object.defineProperty(Element.prototype, 'clientWidth', {
        configurable: true,
        value: viewport,
      })
    }

    const shift = () => (tip() as HTMLElement).style.getPropertyValue('--tip-shift')

    it('desloca para a esquerda o balão que passa da borda direita', async () => {
      mockLayout({ left: 330, width: 100 }, 400)
      const user = userEvent.setup()
      setup()
      await user.tab()
      expect(shift()).toBe('-38px')
    })

    // Quando a fonte da página termina de carregar depois que o balão abriu, a largura do texto
    // muda sem o tamanho da janela mudar: o balão precisa ser medido de novo.
    it('mede de novo quando o balão muda de tamanho sem a janela mudar', async () => {
      const callbacks: ResizeObserverCallback[] = []
      class FakeResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', FakeResizeObserver)
      const layout = { left: 330, width: 100 }
      mockLayout(layout, 400)
      const user = userEvent.setup()
      setup()
      await user.tab()
      expect(shift()).toBe('-38px')

      layout.width = 110
      act(() => callbacks.forEach((callback) => callback([], {} as ResizeObserver)))
      expect(shift()).toBe('-48px')
      vi.unstubAllGlobals()
    })

    it('não desloca o balão que cabe', async () => {
      mockLayout({ left: 100, width: 100 }, 400)
      const user = userEvent.setup()
      setup()
      await user.tab()
      expect(shift()).toBe('0px')
    })

    it('com texto longo, a caixa tem largura máxima da janela menos a margem', async () => {
      mockLayout({ left: 8, width: 120 }, 320)
      const user = userEvent.setup()
      render(
        <Tooltip label={'Mudar para um texto muito longo '.repeat(2)}>
          <button type="button">x</button>
        </Tooltip>,
      )
      await user.tab()
      const css = readFileSync(resolve(__dirname, 'Tooltip.module.css'), 'utf8')
      expect(css).toMatch(/max-width:\s*calc\(100vw - 16px\)/)
      expect(css).toMatch(/white-space:\s*normal/)
    })
  })
})
