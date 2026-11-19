import type { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LINK } from '../test/duel-fixtures'
import { jsonResponse, mockApi } from '../test/http'
import { queryKeys } from '../shared/services/api/query-keys/query-keys'
import { readCss } from '../test/css-file'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../test/render'
import { AppLayout } from './AppLayout'

const summary = (attention: boolean, n: number) => ({
  duelId: `3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4b0${n}`,
  linkToken: `${LINK}${n}`,
  role: 'creator',
  status: 'running',
  myStatus: 'playing',
  source: 'oglobo',
  puzzleDate: '2026-10-14',
  opponentNickname: 'Beto',
  attention,
})

let client: QueryClient | undefined

function render(duels: unknown[]) {
  const queryClient = makeQueryClient()
  client = queryClient
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  const api = mockApi({ 'POST /api/duels/mine': () => jsonResponse(200, { duels }) })
  renderRoutes(
    // Fora da landing: em `/` o cabeçalho não tem o x1 (feature 063).
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [{ path: 'calendario', element: <p>Dias</p> }],
      },
    ],
    ['/calendario'],
    queryClient,
  )
  return api
}

afterEach(async () => {
  vi.useRealTimers()
  // Nenhum pedido pode terminar depois do teste, quando o jsdom já foi desmontado.
  if (client) await waitFor(() => expect(client?.isFetching()).toBe(0))
  resetSessionHandlers()
})

describe('contador do x1 no menu (feature 058)', () => {
  it('soma só os x1 que pedem atenção e diz isso por texto', async () => {
    render([summary(true, 1), summary(true, 2), summary(false, 3)])
    expect(await screen.findByRole('link', { name: 'x1, 2 aguardando' })).toHaveAttribute(
      'href',
      '/x1',
    )
  })

  // Fora de "Meus x1" o cabeçalho não repete a consulta: 15 s em toda página estourava o limite do
  // visitante (60/h) e mantinha o servidor acordado. Atualiza no carregamento, no foco e nas ações.
  it('o cabeçalho consulta uma vez e não repete com o tempo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { calls } = render([summary(true, 1)])
    await screen.findByRole('link', { name: 'x1, 1 aguardando' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls.filter((call) => call.key === 'POST /api/duels/mine')).toHaveLength(1)
  })

  it('sem nada pendente o link é só "x1"', async () => {
    render([summary(false, 1)])
    expect(await screen.findByRole('link', { name: 'x1' })).toBeVisible()
  })

  it('sem x1 esperando o selo some e o botão fica do tamanho do texto', () => {
    const css = readCss('AppLayout.module.css')
    expect(css).toMatch(/\.count\s*{[^}]*display:\s*inline-block/)
    expect(css).toMatch(/\.count\[data-empty='true'\]\s*{[^}]*display:\s*none/)
  })

  // Feature 063: o x1 fica no grupo da direita; o selo no canto, fora do fluxo, não move os vizinhos.
  it('o selo fica no canto do link, fora do fluxo', () => {
    const css = readCss('AppLayout.module.css')
    expect(css).toMatch(/\.duelLink\s*{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.count\s*{[^}]*position:\s*absolute/)
  })
})
