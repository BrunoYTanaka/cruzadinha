import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import {
  cellsFrom,
  makeProgress,
  makePuzzleResponse,
  PUZZLE_ID,
  TINY,
} from '../../../test/fixtures'
import { apiError, jsonResponse, mockApi } from '../../../test/http'
import { aUser, makeQueryClient } from '../../../test/render'
import { readKnownProgress, readPuzzle, savePuzzle, writeKnownProgress } from '../../offline'
import { NeedsConnectionError, useGameData } from './useGameData'

const PUZZLE = `GET /api/puzzles/${PUZZLE_ID}`
const PROGRESS = `GET /api/progress/${PUZZLE_ID}`

function setup(user: typeof aUser | null) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, user ? { user } : null)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return renderHook(() => useGameData(PUZZLE_ID), { wrapper })
}

afterEach(() => vi.restoreAllMocks())

describe('useGameData com cópia guardada (feature 041)', () => {
  it('abre da cópia guardada sem pedir a cruzada à API, mesmo com rede (FR-019)', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    const { calls } = mockApi({})
    const { result } = setup(null)
    await waitFor(() => expect(result.current.owner).not.toBeNull())
    expect(result.current.response?.puzzleId).toBe(PUZZLE_ID)
    expect(calls.some((call) => call.key === PUZZLE)).toBe(false)
  })

  it('guarda a cruzada que veio da rede, sem erro se o armazenamento falhar (FR-002)', async () => {
    mockApi({ [PUZZLE]: () => jsonResponse(200, makePuzzleResponse(TINY)) })
    const { result } = setup(null)
    await waitFor(() => expect(result.current.response).toBeDefined())
    await waitFor(async () => expect(await readPuzzle(PUZZLE_ID)).not.toBeNull())
  })

  it('sem cópia e sem rede, diz que só abre com conexão', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockApi({})
    const { result } = setup(null)
    await waitFor(() => expect(result.current.failure).toBeInstanceOf(NeedsConnectionError))
  })

  it('conta sem rede usa o último progresso conhecido (FR-018)', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    await writeKnownProgress(aUser.id, makeProgress({ cells: cellsFrom(['C..', '.#.', '...']) }))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { calls } = mockApi({})
    const { result } = setup(aUser)
    await waitFor(() => expect(result.current.owner?.kind).toBe('user'))
    expect(calls.some((call) => call.key === PROGRESS)).toBe(false)
    expect(await readKnownProgress(aUser.id, PUZZLE_ID)).not.toBeNull()
  })

  it('conta com resposta do servidor grava o progresso conhecido', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    mockApi({ [PROGRESS]: () => jsonResponse(200, { progress: makeProgress() }) })
    const { result } = setup(aUser)
    await waitFor(() => expect(result.current.owner?.kind).toBe('user'))
    await waitFor(async () => expect(await readKnownProgress(aUser.id, PUZZLE_ID)).not.toBeNull())
  })

  it('erro do servidor no progresso continua sendo falha, não progresso vazio', async () => {
    await savePuzzle(makePuzzleResponse(TINY))
    mockApi({ [PROGRESS]: () => apiError(500, 'internal') })
    const { result } = setup(aUser)
    await waitFor(() => expect(result.current.failure).toBeDefined())
  })
})
