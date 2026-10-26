import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../../../../shared/services/api/client'
import { expectNoA11yViolations } from '../../../../test/axe'
import { makeLibraryItem } from '../../../../test/fixtures'
import { noPuzzleKey } from '../../helpers/source-down'
import { TodayCards, type TodayCardsSource } from './TodayCards'

const today = '2026-10-19'

function entry(
  source: TodayCardsSource['source'],
  name: string,
  overrides: Partial<TodayCardsSource> = {},
): TodayCardsSource {
  return {
    source,
    name,
    items: [],
    query: { isPending: false, isError: false, refetch: vi.fn() },
    ...overrides,
  }
}

function renderCards(libraries: TodayCardsSource[]) {
  const router = createMemoryRouter(
    [{ path: '/', element: <TodayCards libraries={libraries} today={today} /> }],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
})

describe('TodayCards', () => {
  it('um cartão por fonte, na ordem da lista, cada um um único link', async () => {
    const playing = makeLibraryItem(today, { status: 'in_progress', elapsedMs: 522_000 })
    const { container } = renderCards([
      entry('oglobo', 'O Globo', { items: [playing] }),
      entry('cruzadaonline', 'Cruzada Online'),
      entry('cruzadasbrasil', 'Cruzadas Brasil'),
      entry('clube', 'Cruzadas Clube', { items: [makeLibraryItem(today, { source: 'clube' })] }),
    ])
    expect(screen.getByRole('heading', { level: 1, name: 'Hoje' })).toBeInTheDocument()
    expect(screen.getByText('segunda-feira, 19 de outubro')).toBeInTheDocument()
    const cards = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(cards).toHaveLength(puzzleSourceIdSchema.options.length)
    expect(cards[0]).toHaveTextContent('O Globo')
    expect(cards[1]).toHaveTextContent('Cruzada Online')
    expect(cards[2]).toHaveTextContent('Cruzadas Brasil')
    expect(cards[3]).toHaveTextContent('Cruzadas Clube')
    expect(
      screen.getByRole('link', {
        name: 'O Globo: em andamento, 8 minutos e 42 segundos. Continuar',
      }),
    ).toHaveAttribute('href', `/jogo/${playing.puzzleId}`)
    expect(within(cards[0]!).getAllByRole('link')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'Cruzada Online: ainda não guardada. Jogar' }),
    ).toHaveAttribute('href', '/dia/2026-10-19?fonte=cruzadaonline')
    expect(
      screen.getByRole('link', { name: 'Cruzadas Brasil: ainda não guardada. Jogar' }),
    ).toHaveAttribute('href', '/dia/2026-10-19?fonte=cruzadasbrasil')
    await expectNoA11yViolations(container)
  })

  it('"Sem cruzada hoje" não é link', () => {
    window.sessionStorage.setItem(noPuzzleKey('cruzadaonline', today), '1')
    renderCards([entry('oglobo', 'O Globo'), entry('cruzadaonline', 'Cruzada Online')])
    const card = screen.getByText('Sem cruzada hoje').closest('li')!
    expect(within(card).queryByRole('link')).not.toBeInTheDocument()
    expect(card).toHaveTextContent('Cruzada Online')
  })

  it('carregando e erro ficam só no cartão da fonte', async () => {
    const refetch = vi.fn()
    const user = userEvent.setup()
    const { container } = renderCards([
      entry('oglobo', 'O Globo', {
        query: { isPending: true, isError: false, refetch: vi.fn() },
      }),
      entry('cruzadaonline', 'Cruzada Online', {
        query: { isPending: false, isError: true, refetch },
      }),
    ])
    const cards = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(within(cards[0]!).getByText('Carregando…').closest('[aria-busy="true"]')).not.toBeNull()
    expect(cards[1]).toHaveTextContent('Não foi possível carregar.')
    await user.click(within(cards[1]!).getByRole('button', { name: 'Tentar de novo' }))
    expect(refetch).toHaveBeenCalledTimes(1)
    await expectNoA11yViolations(container)
  })

  it('a falha de uma fonte não tira o link da outra', () => {
    renderCards([
      entry('oglobo', 'O Globo', { items: [makeLibraryItem(today)] }),
      entry('cruzadaonline', 'Cruzada Online', {
        query: { isPending: false, isError: true, refetch: vi.fn() },
      }),
    ])
    expect(screen.getByRole('link', { name: 'O Globo: não iniciada. Jogar' })).toBeInTheDocument()
  })

  it('a fonte clube sem edição de hoje mostra "Sem cruzada hoje", sem link e sem buscar', () => {
    renderCards([
      entry('oglobo', 'O Globo'),
      entry('cruzadaonline', 'Cruzada Online'),
      entry('clube', 'Cruzadas Clube'),
    ])
    const card = screen.getByText('Cruzadas Clube').closest('li')!
    expect(card).toHaveTextContent('Sem cruzada hoje')
    expect(within(card).queryByRole('link')).not.toBeInTheDocument()
  })

  it('a fonte clube com edição de hoje é um link para jogar', () => {
    const item = makeLibraryItem(today, { source: 'clube' })
    renderCards([
      entry('oglobo', 'O Globo'),
      entry('cruzadaonline', 'Cruzada Online'),
      entry('clube', 'Cruzadas Clube', { items: [item] }),
    ])
    expect(
      screen.getByRole('link', { name: 'Cruzadas Clube: não iniciada. Jogar' }),
    ).toHaveAttribute('href', `/jogo/${item.puzzleId}`)
  })

  it('uma API anterior que recusa a fonte (400) deixa só aquele cartão indisponível', () => {
    renderCards([
      entry('oglobo', 'O Globo', { items: [makeLibraryItem(today)] }),
      entry('clube', 'Cruzadas Clube', {
        query: {
          isPending: false,
          isError: true,
          error: new ApiRequestError(400, { code: 'invalid-input' }),
          refetch: vi.fn(),
        },
      }),
    ])
    const card = screen.getByText('Cruzadas Clube').closest('li')!
    expect(card).toHaveTextContent('Não disponível agora.')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'O Globo: não iniciada. Jogar' })).toBeInTheDocument()
  })
})
