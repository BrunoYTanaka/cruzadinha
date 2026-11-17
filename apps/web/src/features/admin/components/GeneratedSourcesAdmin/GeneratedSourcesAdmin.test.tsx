import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { makeQueryClient } from '../../../../test/render'
import { GeneratedSourcesAdmin } from './GeneratedSourcesAdmin'

const PUZZLE_ID = '0b7d6c43-6f1d-4f6c-9a50-2f0d3a1b9c11'

const today = (overrides = {}) => ({
  puzzleId: PUZZLE_ID,
  size: 11,
  discardable: true,
  blockedBy: null,
  words: [
    { number: 1, direction: 'across', answer: 'SOL', clue: 'Estrela do dia' },
    { number: 2, direction: 'down', answer: 'LUA', clue: 'Brilha à noite' },
  ],
  ...overrides,
})

const view = (overrides = {}) => ({
  source: 'casa',
  gridSize: 11,
  difficulty: 'medium',
  callsLeft: 2,
  today: today(),
  ...overrides,
})

function setup(
  handlers: Parameters<typeof mockApi>[0] = {},
  initial: ReturnType<typeof view> = view(),
) {
  const api = mockApi({
    'GET /api/admin/generated': () => jsonResponse(200, { sources: [initial] }),
    ...handlers,
  })
  const rendered = render(
    <QueryClientProvider client={makeQueryClient()}>
      <GeneratedSourcesAdmin />
    </QueryClientProvider>,
  )
  return { ...api, ...rendered }
}

afterEach(() => vi.restoreAllMocks())

describe('GeneratedSourcesAdmin (feature 064)', () => {
  it('mostra configuração, chamadas restantes, respostas e dicas', async () => {
    const { container } = setup()
    expect(await screen.findByRole('spinbutton', { name: /Tamanho da grade/ })).toHaveValue(11)
    expect(screen.getByRole('radio', { name: 'Médio' })).toBeChecked()
    expect(screen.getByText('Chamadas restantes hoje: 2')).toBeInTheDocument()
    expect(screen.getByText(/SOL/).closest('li')).toHaveTextContent('1. SOL — Estrela do dia')
    expect(screen.getByRole('heading', { name: 'Verticais' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar Casa' })).toBeDisabled()
    await expectNoA11yViolations(container)
  })

  it('salva tamanho e dificuldade novos', async () => {
    const user = userEvent.setup()
    const { calls } = setup({
      'PUT /api/admin/generated/settings': () =>
        jsonResponse(200, view({ gridSize: 13, difficulty: 'hard' })),
    })
    const size = await screen.findByRole('spinbutton', { name: /Tamanho da grade/ })
    await user.clear(size)
    await user.type(size, '13')
    await user.click(screen.getByRole('radio', { name: 'Difícil' }))
    await user.click(screen.getByRole('button', { name: 'Salvar Casa' }))
    expect(await screen.findByText(/Vale a partir da próxima cruzada/)).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'PUT /api/admin/generated/settings')?.body).toEqual({
      source: 'casa',
      gridSize: 13,
      difficulty: 'hard',
    })
  })

  it('não deixa salvar um tamanho fora de 9 a 15', async () => {
    const user = userEvent.setup()
    setup()
    const size = await screen.findByRole('spinbutton', { name: /Tamanho da grade/ })
    await user.clear(size)
    await user.type(size, '16')
    expect(screen.getByRole('button', { name: 'Salvar Casa' })).toBeDisabled()
  })

  it('descarta depois de confirmar e mostra como gerar de novo', async () => {
    const user = userEvent.setup()
    const { calls } = setup({
      'POST /api/admin/generated/discard': () => jsonResponse(200, { discarded: true }),
    })
    await user.click(await screen.findByRole('button', { name: 'Descartar cruzada de hoje' }))
    const dialog = screen.getByRole('dialog', { name: 'Descartar a cruzada de hoje?' })
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
    expect(await screen.findByText(/gh workflow run collect.yml/)).toBeInTheDocument()
    await waitFor(() =>
      expect(calls.find((call) => call.key === 'POST /api/admin/generated/discard')?.body).toEqual({
        source: 'casa',
        puzzleId: PUZZLE_ID,
      }),
    )
  })

  it('avisa que o dia ficará vazio quando as chamadas acabaram', async () => {
    const user = userEvent.setup()
    setup(
      { 'POST /api/admin/generated/discard': () => jsonResponse(200, { discarded: true }) },
      view({ callsLeft: 0 }),
    )
    await user.click(await screen.findByRole('button', { name: 'Descartar cruzada de hoje' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('o dia ficará sem cruzada')
  })

  it('não deixa descartar uma cruzada em uso e diz por quê', async () => {
    setup({}, view({ today: today({ discardable: false, blockedBy: 'progress' }) }))
    expect(await screen.findByRole('button', { name: 'Descartar cruzada de hoje' })).toBeDisabled()
    expect(screen.getByText('Uma conta já começou esta cruzada.')).toBeInTheDocument()
  })

  it('mostra o erro quando a cruzada passou a ser usada', async () => {
    const user = userEvent.setup()
    setup({ 'POST /api/admin/generated/discard': () => apiError(409, 'in-use') })
    await user.click(await screen.findByRole('button', { name: 'Descartar cruzada de hoje' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }))
    expect(await screen.findByText(/Nada foi descartado/)).toBeInTheDocument()
  })

  it('sem cruzada hoje, diz isso e não mostra o descarte', async () => {
    setup({}, view({ today: null }))
    expect(await screen.findByText('Sem cruzada hoje.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descartar cruzada de hoje' })).toBeNull()
  })
})
