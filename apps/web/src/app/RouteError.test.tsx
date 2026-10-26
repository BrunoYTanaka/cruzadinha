import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../shared/services/api/client/client'
import { ServerWakeTimeoutError } from '../shared/services/api/server-wake/server-wake'
import { mockMatchMedia } from '../test/media'
import { renderRoutes } from '../test/render'
import { RouteError } from './RouteError'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RouteError', () => {
  it('offers to try again when the server did not wake up, and waits again', async () => {
    mockMatchMedia(() => false)
    let attempts = 0
    let release: () => void = () => {}
    const loader = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new ServerWakeTimeoutError()
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return null
    })
    renderRoutes(
      [{ path: '/', loader, errorElement: <RouteError />, element: <p>Biblioteca</p> }],
      ['/'],
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Não foi possível falar com o servidor.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('O servidor não respondeu em 90 segundos.')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    const waking = await screen.findByRole('heading', { level: 1, name: 'Acordando o servidor' })
    expect(waking).toHaveFocus()
    expect(loader).toHaveBeenCalledTimes(2)

    release()
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument()
  })

  it('keeps the generic message for other errors', async () => {
    const loader = vi.fn(async () => {
      throw new Error('boom')
    })
    renderRoutes([{ path: '/', loader, errorElement: <RouteError />, element: <p>x</p> }], ['/'])
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Algo deu errado' }),
      ).toBeInTheDocument(),
    )
  })

  it('shows "Sem conexão" as the only level-one heading when there is no network', async () => {
    const loader = vi.fn(async () => {
      throw new ApiRequestError(0)
    })
    renderRoutes([{ path: '/', loader, errorElement: <RouteError />, element: <p>x</p> }], ['/'])
    expect(await screen.findByRole('heading', { level: 1, name: 'Sem conexão' })).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
