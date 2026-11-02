import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
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

function render(duels: unknown[]) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, { user: aUser })
  mockApi({ 'POST /api/duels/mine': () => jsonResponse(200, { duels }) })
  renderRoutes(
    [{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>Início</p> }] }],
    ['/'],
    queryClient,
  )
}

afterEach(() => resetSessionHandlers())

describe('contador do x1 no menu (feature 058)', () => {
  it('soma só os x1 que pedem atenção e diz isso por texto', async () => {
    render([summary(true, 1), summary(true, 2), summary(false, 3)])
    expect(await screen.findByRole('link', { name: 'x1, 2 aguardando' })).toHaveAttribute(
      'href',
      '/x1',
    )
  })

  it('sem nada pendente o link é só "x1"', async () => {
    render([summary(false, 1)])
    expect(await screen.findByRole('link', { name: 'x1' })).toBeVisible()
  })

  it('o selo fica fora do fluxo, então o cabeçalho não pula quando o número aparece', () => {
    const css = readCss('AppLayout.module.css')
    expect(css).toMatch(/\.count\s*{[^}]*position:\s*absolute/)
    expect(css).toMatch(/\.duelLink\s*{[^}]*position:\s*relative/)
  })
})
