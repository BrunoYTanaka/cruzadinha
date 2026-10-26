import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../../test/axe'
import { makePuzzleResponse, LAYOUT5 } from '../../../../../test/fixtures'
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
    render(<ClueList puzzle={puzzle} activeWord={null} struck={new Set()} onSelect={() => {}} />)
    expect(screen.getByRole('region', { name: 'Horizontais' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Verticais' })).toBeInTheDocument()
  })

  it('marca só as dicas resolvidas, com o visto, e diz "resolvida" ao leitor de tela', async () => {
    const { container } = render(
      <ClueList
        puzzle={puzzle}
        activeWord={null}
        struck={new Set(['1across'])}
        onSelect={() => {}}
      />,
    )
    const done = screen.getByRole('button', { name: /^1 ?Dica 1 horizontal, resolvida$/ })
    expect(done.className).toMatch(/done/)
    // Feature 017: o visto é decorativo; o leitor de tela ouve ", resolvida" uma vez só.
    expect(done.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    const other = screen.getByRole('button', { name: /^6 ?Dica 6 horizontal$/ })
    expect(other.className).not.toMatch(/done/)
    expect(other.querySelector('svg')).toBeNull()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.getAllByText(', resolvida')).toHaveLength(1)
    await expectNoA11yViolations(container)
  })

  it('a dica resolvida que também é a ativa fica com as duas marcas e o visto', async () => {
    const { container } = render(
      <ClueList
        puzzle={puzzle}
        activeWord={across[0]!}
        struck={new Set(['1across'])}
        onSelect={() => {}}
      />,
    )
    const done = screen.getByRole('button', { name: /^1 ?Dica 1 horizontal, resolvida$/ })
    expect(done).toHaveAttribute('aria-current', 'true')
    expect(done.className).toMatch(/active/)
    expect(done.className).toMatch(/done/)
    expect(done.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    await expectNoA11yViolations(container)
  })

  it('ao preencher, só risca: sem fundo de sucesso, sem visto e diz "preenchida" (feature 021)', async () => {
    const { container } = render(
      <ClueList
        puzzle={puzzle}
        activeWord={null}
        struck={new Set(['1across'])}
        strikeMode="filled"
        onSelect={() => {}}
      />,
    )
    const marked = screen.getByRole('button', { name: /^1 ?Dica 1 horizontal, preenchida$/ })
    expect(marked.className).toMatch(/struck/)
    expect(marked.className).not.toMatch(/done/)
    expect(container.querySelectorAll('svg')).toHaveLength(0)
    expect(screen.queryByText(', resolvida')).toBeNull()
    await expectNoA11yViolations(container)
  })

  it('com fill, rola só o grupo da dica ativa, sem rolar a página', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={first} struck={new Set()} onSelect={() => {}} fill />,
    )
    const group = screen.getByRole('region', { name: 'Horizontais' })
    const target = within(group).getByText(last.clue).closest('button')!
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(rect(0, 100))
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(140, 180))
    group.scrollTop = 0

    rerender(
      <ClueList puzzle={puzzle} activeWord={last} struck={new Set()} onSelect={() => {}} fill />,
    )
    expect(group.scrollTop).toBe(80)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('com fill, não deixa a dica ativa escondida sob o título fixo do grupo', () => {
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={last} struck={new Set()} onSelect={() => {}} fill />,
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
      <ClueList puzzle={puzzle} activeWord={first} struck={new Set()} onSelect={() => {}} fill />,
    )
    expect(group.scrollTop).toBe(180)
  })

  it('sem fill, não rola nada', () => {
    const first = across[0]!
    const last = across[across.length - 1]!
    const { rerender } = render(
      <ClueList puzzle={puzzle} activeWord={first} struck={new Set()} onSelect={() => {}} />,
    )
    const group = screen.getByRole('region', { name: 'Horizontais' })
    const target = within(group).getByText(last.clue).closest('button')!
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(rect(0, 100))
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(140, 180))
    rerender(<ClueList puzzle={puzzle} activeWord={last} struck={new Set()} onSelect={() => {}} />)
    expect(group.scrollTop).toBe(0)
  })
})
