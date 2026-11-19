import type { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { apiError, jsonResponse, mockApi, type Handler } from '../../../../test/http'
import { makeQueryClient, renderRoutes, resetSessionHandlers } from '../../../../test/render'
import { AdminTabs } from './AdminTabs'

const sources = [
  { id: 'oglobo', visible: true, position: 0 },
  { id: 'cruzadaonline', visible: true, position: 1 },
]

const casa = { source: 'casa', gridSize: 11, difficulty: 'medium', callsLeft: 3, today: null }

let client: QueryClient | undefined

function visit(path: string, generated: Handler = () => jsonResponse(200, { sources: [casa] })) {
  mockApi({
    'GET /api/admin/sources': () => jsonResponse(200, { sources }),
    'GET /api/admin/generated': generated,
  })
  client = makeQueryClient()
  return renderRoutes([{ path: '/admin', element: <AdminTabs /> }], [path], client)
}

const tab = (name: RegExp) => screen.getByRole('tab', { name })

afterEach(async () => {
  if (client) await waitFor(() => expect(client?.isFetching()).toBe(0))
  vi.restoreAllMocks()
  resetSessionHandlers()
})

describe('AdminTabs (feature 066)', () => {
  it('abre "Fontes" com as abas e legendas, painel inativo oculto', async () => {
    const view = visit('/admin')
    expect(
      await screen.findByRole('tablist', { name: 'Seções da administração' }),
    ).toBeInTheDocument()
    expect(tab(/^Fontes/)).toHaveAccessibleName('Fontes ordem e visibilidade')
    expect(tab(/^Casa/)).toHaveAccessibleName('Casa fonte gerada')
    expect(tab(/^Fontes/)).toHaveAttribute('aria-selected', 'true')
    expect(document.getElementById('admin-panel-casa')).not.toBeVisible()
    expect(await screen.findByRole('checkbox', { name: /O Globo/ })).toBeVisible()
    await expectNoA11yViolations(view.container)
  })

  it.each([
    ['/admin?aba=casa', /^Casa/],
    ['/admin?aba=fontes', /^Fontes/],
    ['/admin?aba=xyz', /^Fontes/],
  ])('%s escolhe a aba certa', async (path, expected) => {
    visit(path)
    await screen.findByRole('tablist')
    expect(tab(expected)).toHaveAttribute('aria-selected', 'true')
  })

  it('trocar de aba grava ?aba= substituindo o histórico', async () => {
    const user = userEvent.setup()
    const { router } = visit('/admin')
    await user.click(await screen.findByRole('tab', { name: /^Casa/ }))
    expect(router.state.location.search).toBe('?aba=casa')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(tab(/^Casa/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Casa' })).toBeVisible()
  })

  it('ida e volta entre abas não perde rascunho', async () => {
    const user = userEvent.setup()
    visit('/admin')
    await user.click(await screen.findByRole('checkbox', { name: /O Globo/ }))
    await user.click(tab(/^Casa/))
    await user.click(screen.getByRole('button', { name: 'Aumentar a grade' }))
    await user.click(tab(/^Fontes/))
    expect(screen.getByRole('checkbox', { name: /O Globo/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    await user.click(tab(/^Casa/))
    expect(screen.getByRole('group', { name: 'Tamanho da grade' })).toHaveTextContent('12 × 12')
  })

  it('sem a lista de fontes geradas: só "Fontes" e o erro com tentar de novo', async () => {
    visit('/admin?aba=casa', () => apiError(500, 'internal'))
    expect(
      await screen.findByText('Não foi possível carregar as fontes geradas agora.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((element) => element.id)).toEqual(['admin-tab-fontes'])
    expect(tab(/^Fontes/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Tentar de novo/i })).toBeInTheDocument()
  })

  it('enquanto a lista carrega, nenhuma aba aparece', async () => {
    let release: (response: Response) => void = () => undefined
    let first = true
    // Só o primeiro pedido fica esperando; o painel pede de novo ao montar e recebe na hora.
    visit('/admin?aba=casa', () => {
      if (!first) return jsonResponse(200, { sources: [casa] })
      first = false
      return new Promise<Response>((resolve) => (release = resolve))
    })
    await waitFor(() => expect(screen.queryByRole('tablist')).toBeNull())
    release(jsonResponse(200, { sources: [casa] }))
    expect(await screen.findByRole('tab', { name: /^Casa/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
