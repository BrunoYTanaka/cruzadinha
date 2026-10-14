import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { queryKeys } from '../../api/query-keys'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { KonamiListener } from './KonamiListener'

const CODE = 'ABCD-EFGH-JKLM-NPQR'
const SEQUENCE =
  '{ArrowUp}{ArrowUp}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowRight}{ArrowLeft}{ArrowRight}ba'

function Page() {
  return (
    <>
      <KonamiListener />
      <input aria-label="Campo" />
      <textarea aria-label="Texto" />
      <p>Biblioteca</p>
    </>
  )
}

function renderAt(path: string, { session = true } = {}) {
  const queryClient = makeQueryClient()
  if (session) queryClient.setQueryData(queryKeys.session, { user: aUser })
  return renderRoutes(
    [
      { path: '/', element: <Page /> },
      { path: '/jogo/:id', element: <Page /> },
    ],
    [path],
    queryClient,
  )
}

const created = () => jsonResponse(201, { code: CODE, expiresAt: '2026-10-21T15:00:00.000Z' })
const list = () =>
  jsonResponse(200, {
    invites: [
      {
        createdAt: '2026-10-14T15:00:00.000Z',
        expiresAt: '2026-10-21T15:00:00.000Z',
        status: 'active',
      },
      {
        createdAt: '2026-10-10T15:00:00.000Z',
        expiresAt: '2026-10-17T15:00:00.000Z',
        status: 'active',
      },
      {
        createdAt: '2026-10-01T15:00:00.000Z',
        expiresAt: '2026-10-08T15:00:00.000Z',
        status: 'expired',
      },
    ],
  })

afterEach(() => {
  resetSessionHandlers()
})

describe('KonamiListener', () => {
  it('na biblioteca, a sequência cria o convite e mostra o código', async () => {
    const { calls } = mockApi({ 'POST /api/invites': created, 'GET /api/invites': list })
    const user = userEvent.setup()
    renderAt('/')
    await user.keyboard(SEQUENCE)
    expect(await screen.findByText(CODE)).toBeInTheDocument()
    expect(calls.filter((call) => call.key === 'POST /api/invites')).toHaveLength(1)
    expect(await screen.findByText('2 convites ativos')).toBeInTheDocument()
  })

  it('não age em input nem textarea', async () => {
    const { calls } = mockApi({ 'POST /api/invites': created, 'GET /api/invites': list })
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByLabelText('Campo'))
    await user.keyboard(SEQUENCE)
    await user.click(screen.getByLabelText('Texto'))
    await user.keyboard(SEQUENCE)
    expect(calls).toHaveLength(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não age na rota do jogo', async () => {
    const { calls } = mockApi({ 'POST /api/invites': created })
    const user = userEvent.setup()
    renderAt('/jogo/abc')
    await user.keyboard(SEQUENCE)
    expect(calls).toHaveLength(0)
  })

  it('não age sem sessão', async () => {
    const { calls } = mockApi({
      'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
      'POST /api/invites': created,
    })
    const user = userEvent.setup()
    renderAt('/', { session: false })
    await user.keyboard(SEQUENCE)
    expect(calls.filter((call) => call.key === 'POST /api/invites')).toHaveLength(0)
  })

  it('cota cheia explica sem repetir o número da cota e mostra a validade do mais antigo', async () => {
    mockApi({
      'POST /api/invites': () => apiError(409, 'invite-quota-reached'),
      'GET /api/invites': list,
    })
    const user = userEvent.setup()
    renderAt('/')
    await user.keyboard(SEQUENCE)
    const dialog = await screen.findByRole('dialog', { name: 'Convites no limite' })
    expect(dialog).toHaveTextContent('Abre uma vaga quando um deles for usado ou expirar')
    expect(await screen.findByText(/O mais antigo vale até 17 de outubro/)).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(/\b3\b/)
    await user.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('429 mostra a espera', async () => {
    mockApi({
      'POST /api/invites': () =>
        jsonResponse(429, { error: 'too-many-attempts', message: 'x' }, { 'retry-after': '120' }),
    })
    const user = userEvent.setup()
    renderAt('/')
    await user.keyboard(SEQUENCE)
    expect(
      await screen.findByText('Muitas tentativas. Tente de novo em 2 min.'),
    ).toBeInTheDocument()
  })

  it('"Pronto" fecha e descarta o código (nada no armazenamento)', async () => {
    mockApi({ 'POST /api/invites': created, 'GET /api/invites': list })
    const user = userEvent.setup()
    renderAt('/')
    await user.keyboard(SEQUENCE)
    await screen.findByText(CODE)
    expect(JSON.stringify({ ...window.localStorage, ...window.sessionStorage })).not.toContain(CODE)
    await user.click(screen.getByRole('button', { name: 'Pronto' }))
    expect(screen.queryByText(CODE)).not.toBeInTheDocument()
    await act(async () => {})
    expect(document.body).not.toHaveTextContent(CODE)
  })
})
