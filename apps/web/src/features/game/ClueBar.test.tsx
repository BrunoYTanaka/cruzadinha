import type { Word } from '@cruzadinha/shared'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/axe'
import { ClueBar } from './ClueBar'

const word: Word = {
  number: 1,
  direction: 'across',
  row: 0,
  col: 0,
  length: 3,
  clue: 'Astro do dia',
}

describe('ClueBar', () => {
  it('com anterior e próxima, mostra os dois botões e chama cada um', async () => {
    const user = userEvent.setup()
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    const { container } = render(<ClueBar word={word} onPrevious={onPrevious} onNext={onNext} />)
    await user.click(screen.getByRole('button', { name: 'Dica anterior' }))
    await user.click(screen.getByRole('button', { name: 'Próxima dica' }))
    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    await expectNoA11yViolations(container)
  })

  it('sem as props, não tem botões', () => {
    render(<ClueBar word={word} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('continua anunciando a dica ativa', () => {
    render(<ClueBar word={word} onPrevious={() => {}} onNext={() => {}} />)
    const live = screen.getByText('Astro do dia').closest('[aria-live]')
    expect(live).toHaveAttribute('aria-live', 'polite')
  })

  // Feature 017: a barra corta a dica longa com reticências só no CSS; o leitor de tela ouve tudo.
  const longWord: Word = {
    ...word,
    number: 12,
    clue:
      'Dica inventada e comprida de propósito, que fala de um barco de papel atravessando um lago ' +
      'inteiro numa tarde de vento, passando por patos, juncos e pontes de madeira até a outra margem',
  }

  it.each([
    ['com anterior e próxima', { onPrevious: () => {}, onNext: () => {} }],
    ['sem anterior e próxima', {}],
  ])('%s, a região viva tem a dica longa inteira, sem reticências', (_, props) => {
    const { container } = render(<ClueBar word={longWord} {...props} />)
    const live = container.querySelector('[aria-live]')
    expect(live?.textContent).toBe(`12 Horizontal${longWord.clue}`)
    expect(live?.textContent).not.toContain('…')
  })

  // Feature 018: com o mouse parado 500 ms sobre a dica cortada, um balão mostra a dica inteira. O
  // jsdom não faz layout, então o corte é simulado pelas medidas do texto.
  describe('balão com a dica completa', () => {
    function measure(scrollWidth: number) {
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200)
    }
    const cut = () => measure(400)
    const fits = () => measure(200)

    const otherWord: Word = { ...longWord, number: 3, direction: 'down' }
    const balloon = () => screen.queryByTestId('full-clue')
    const clueText = () => screen.getByText(longWord.clue, { selector: 'span' })

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    // O user-event espera `setTimeout` reais entre as ações, o que trava com os temporizadores
    // falsos do Vitest; `fireEvent` é síncrono e mantém o tempo exato (499 e 500 ms).
    // `pointerEnter`/`pointerLeave` também disparam `pointerover`/`pointerout`, que o React usa.
    const hover = (element: Element) => fireEvent.pointerEnter(element, { pointerType: 'mouse' })
    const leave = (element: Element) => fireEvent.pointerLeave(element, { pointerType: 'mouse' })
    const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

    function setup(props: Partial<Parameters<typeof ClueBar>[0]> = {}) {
      return render(<ClueBar word={longWord} onPrevious={() => {}} onNext={() => {}} {...props} />)
    }

    function open() {
      hover(clueText())
      wait(500)
      expect(balloon()).toHaveTextContent(longWord.clue)
    }

    it.each([
      ['com anterior e próxima', { onPrevious: () => {}, onNext: () => {} }],
      ['sem anterior e próxima', { onPrevious: undefined, onNext: undefined }],
    ])('%s, abre aos 500 ms com a dica inteira e não antes', (_, props) => {
      cut()
      setup(props)
      hover(clueText())
      wait(499)
      expect(balloon()).toBeNull()
      wait(1)
      expect(balloon()).toHaveTextContent(longWord.clue)
    })

    it('conta o meio segundo desde o último movimento do mouse', () => {
      cut()
      setup()
      hover(clueText())
      wait(300)
      fireEvent.pointerMove(clueText(), { pointerType: 'mouse' })
      wait(300)
      expect(balloon()).toBeNull()
      wait(200)
      expect(balloon()).toHaveTextContent(longWord.clue)
    })

    it('abre ao mover o mouse se a dica só ficou cortada depois de ele entrar', () => {
      fits()
      setup()
      hover(clueText())
      wait(500)
      expect(balloon()).toBeNull()
      vi.restoreAllMocks()
      cut()
      fireEvent.pointerMove(clueText(), { pointerType: 'mouse' })
      wait(500)
      expect(balloon()).toHaveTextContent(longWord.clue)
    })

    it('não abre quando a dica cabe inteira', () => {
      fits()
      setup()
      hover(clueText())
      wait(500)
      expect(balloon()).toBeNull()
    })

    it('não abre quando o mouse sai antes do intervalo', () => {
      cut()
      setup()
      hover(clueText())
      wait(300)
      leave(clueText())
      wait(500)
      expect(balloon()).toBeNull()
    })

    it('não abre com toque', () => {
      cut()
      setup()
      fireEvent.pointerEnter(clueText(), { pointerType: 'touch' })
      wait(500)
      expect(balloon()).toBeNull()
    })

    it('continua aberto sobre o balão e os botões; fecha ao sair da barra', () => {
      cut()
      const { container } = setup()
      open()
      hover(screen.getByTestId('full-clue'))
      hover(screen.getByRole('button', { name: 'Próxima dica' }))
      hover(screen.getByRole('button', { name: 'Dica anterior' }))
      expect(balloon()).not.toBeNull()
      const bar = container.firstElementChild
      if (!bar) throw new Error('a barra deveria estar na tela')
      leave(bar)
      expect(balloon()).toBeNull()
    })

    it('fecha com Esc', () => {
      cut()
      setup()
      open()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(balloon()).toBeNull()
    })

    it('fecha quando a palavra ativa muda', () => {
      cut()
      const { rerender } = setup()
      open()
      rerender(<ClueBar word={otherWord} onPrevious={() => {}} onNext={() => {}} />)
      expect(balloon()).toBeNull()
    })

    it('é só visual: aria-hidden e uma única região viva, sem violações', async () => {
      cut()
      const { container } = setup()
      open()
      expect(balloon()).toHaveAttribute('aria-hidden', 'true')
      expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
      vi.useRealTimers()
      await expectNoA11yViolations(container)
    })
  })
})
