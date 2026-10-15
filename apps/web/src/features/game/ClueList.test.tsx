import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makePuzzleResponse, LAYOUT5 } from '../../test/fixtures'
import { ClueList } from './ClueList'

const { puzzle } = makePuzzleResponse(LAYOUT5)
const across = puzzle.words.filter((word) => word.direction === 'across')

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ClueList', () => {
  it('mantém horizontais e verticais separadas', () => {
    render(<ClueList puzzle={puzzle} activeWord={null} filled={new Set()} onSelect={() => {}} />)
    expect(screen.getByRole('region', { name: 'Horizontais' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Verticais' })).toBeInTheDocument()
  })

  it('com fill, rola só o grupo da dica ativa, sem rolar a página', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={first} filled={new Set()} onSelect={() => {}} fill />,
    )
    const group = screen.getByRole('region', { name: 'Horizontais' })
    const target = within(group).getByText(last.clue).closest('button')!
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(rect(0, 100))
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(140, 180))
    group.scrollTop = 0

    rerender(
      <ClueList puzzle={puzzle} activeWord={last} filled={new Set()} onSelect={() => {}} fill />,
    )
    expect(group.scrollTop).toBe(80)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('com fill, não deixa a dica ativa escondida sob o título fixo do grupo', () => {
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={last} filled={new Set()} onSelect={() => {}} fill />,
    )
    const group = screen.getByRole('region', { name: 'Horizontais' })
    const heading = within(group).getByRole('heading')
    const target = within(group).getByText(first.clue).closest('button')!
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(rect(0, 100))
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(rect(0, 30))
    // A dica está dentro do grupo, mas atrás do título (que vai de 0 a 30).
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(10, 50))
    group.scrollTop = 200

    rerender(
      <ClueList puzzle={puzzle} activeWord={first} filled={new Set()} onSelect={() => {}} fill />,
    )
    expect(group.scrollTop).toBe(180)
  })

  it('sem fill, não rola nada', () => {
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={first} filled={new Set()} onSelect={() => {}} />,
    )
    const group = screen.getByRole('region', { name: 'Horizontais' })
    const target = within(group).getByText(last.clue).closest('button')!
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(rect(0, 100))
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(140, 180))
    rerender(<ClueList puzzle={puzzle} activeWord={last} filled={new Set()} onSelect={() => {}} />)
    expect(group.scrollTop).toBe(0)
  })
})
