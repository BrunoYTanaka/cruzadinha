import { act, render, renderHook, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildIndex } from '../../game-logic/navigation'
import { LAYOUT5, makePuzzle } from '../../test/fixtures'
import { Keyboard } from './Keyboard'
import { ON_SCREEN_KEYBOARD_QUERY, useOnScreenKeyboard } from './useOnScreenKeyboard'
import { WordBar } from './WordBar'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Keyboard', () => {
  it('tem de A a Z, Ç, apagar e Dicas', () => {
    render(<Keyboard onLetter={() => {}} onBackspace={() => {}} onClues={() => {}} />)
    const letters = screen
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((text): text is string => text !== null && /^[A-ZÇ]$/.test(text))
    expect([...letters].sort()).toEqual([...'ABCDEFGHIJKLMNOPQRSTUVWXYZÇ'].sort())
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dicas' })).toBeInTheDocument()
  })

  it('chama as ações certas e não tira o foco do tabuleiro', async () => {
    const user = userEvent.setup()
    const onLetter = vi.fn()
    const onBackspace = vi.fn()
    const onClues = vi.fn()
    render(
      <div>
        <div role="grid" tabIndex={0} aria-label="Tabuleiro" />
        <Keyboard onLetter={onLetter} onBackspace={onBackspace} onClues={onClues} />
      </div>,
    )
    screen.getByRole('grid').focus()
    await user.click(screen.getByRole('button', { name: 'Ç' }))
    await user.click(screen.getByRole('button', { name: 'Apagar' }))
    await user.click(screen.getByRole('button', { name: 'Dicas' }))
    expect(onLetter).toHaveBeenCalledWith('Ç')
    expect(onBackspace).toHaveBeenCalledTimes(1)
    expect(onClues).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('grid')).toHaveFocus()
  })

  it('as teclas têm 46 px de altura', () => {
    const keyboardCss = readFileSync(join(import.meta.dirname, 'Keyboard.module.css'), 'utf-8')
    expect(keyboardCss).toMatch(/\.key\s*\{[^}]*min-height:\s*46px/)
  })
})

describe('useOnScreenKeyboard', () => {
  function stubMatchMedia(matches: boolean) {
    const queries: string[] = []
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => {
        queries.push(query)
        return {
          matches,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }
      }),
    )
    return queries
  }

  it('aparece com ponteiro grosseiro ou largura pequena', () => {
    const queries = stubMatchMedia(true)
    const { result } = renderHook(() => useOnScreenKeyboard())
    expect(result.current).toBe(true)
    expect(queries[0]).toBe(ON_SCREEN_KEYBOARD_QUERY)
    expect(ON_SCREEN_KEYBOARD_QUERY).toContain('(pointer: coarse)')
    expect(ON_SCREEN_KEYBOARD_QUERY).toContain('(max-width: 720px)')
  })

  it('some no computador com mouse', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useOnScreenKeyboard())
    expect(result.current).toBe(false)
  })

  it('sem matchMedia fica escondido', () => {
    const { result } = renderHook(() => useOnScreenKeyboard())
    expect(result.current).toBe(false)
  })

  it('acompanha a mudança da media query', () => {
    let listener: () => void = () => {}
    let matches = false
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, fn: () => void) => (listener = fn),
        removeEventListener: () => {},
      })),
    )
    const { result } = renderHook(() => useOnScreenKeyboard())
    expect(result.current).toBe(false)
    matches = true
    act(() => listener())
    expect(result.current).toBe(true)
  })
})

describe('WordBar', () => {
  const puzzle = makePuzzle(LAYOUT5)
  const index = buildIndex(puzzle)
  const word = index.words.find((item) => item.number === 6 && item.direction === 'across') ?? null

  it('mostra a palavra ativa ampliada com a dica', () => {
    const cells = [
      [null, null, null, null, null],
      [null, null, null, null, null],
      ['A', 'R', null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]
    render(<WordBar word={word} index={index} cells={cells} selected={{ row: 2, col: 2 }} />)
    const bar = screen.getByTestId('word-bar')
    expect(bar).toHaveTextContent('6 Horizontal')
    expect(bar).toHaveTextContent('Dica 6 horizontal')
    expect(bar.querySelectorAll('span > span')).toHaveLength(5)
    expect(bar.textContent).toContain('AR')
    // redundante com a dica e com o tabuleiro: fica fora da leitura de tela
    expect(bar).toHaveAttribute('aria-hidden', 'true')
  })

  it('não mostra nada sem palavra ativa', () => {
    const { container } = render(<WordBar word={null} index={index} cells={[]} selected={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
