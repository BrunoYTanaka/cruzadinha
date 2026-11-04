import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { makeQueryClient } from '../../../../test/render'
import { SourcesAdmin } from './SourcesAdmin'

const initial = [
  { id: 'oglobo', visible: true, position: 0 },
  { id: 'cruzadaonline', visible: true, position: 1 },
  { id: 'cruzadasbrasil', visible: true, position: 2 },
  { id: 'clube', visible: true, position: 3 },
]

function setup(put?: (body: unknown) => Response) {
  const api = mockApi({
    'GET /api/admin/sources': () => jsonResponse(200, { sources: initial }),
    ...(put ? { 'PUT /api/admin/sources': ({ body }) => put(body) } : {}),
  })
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SourcesAdmin />
    </QueryClientProvider>,
  )
  return { ...api, ...view }
}

const names = () => screen.getAllByRole('listitem').map((item) => item.textContent ?? '')

afterEach(() => vi.restoreAllMocks())

describe('SourcesAdmin', () => {
  it('lists every source in order with its state and the save button off', async () => {
    setup()
    expect(await screen.findByRole('checkbox', { name: /O Globo/ })).toBeChecked()
    expect(names()[0]).toContain('O Globo')
    expect(names()[3]).toContain('Cruzadas Clube')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  const handle = (name: string) => screen.getByRole('button', { name: `Arrastar ${name}` })
  const live = () => screen.getByRole('status', { name: '' })

  it('keyboard: Space grabs, arrows move, Space drops, with the position announced', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    handle('Cruzadas Clube').focus()
    await user.keyboard(' ')
    expect(handle('Cruzadas Clube')).toHaveAttribute('aria-pressed', 'true')
    expect(live()).toHaveTextContent('Cruzadas Clube pega, posição 4 de 4')
    await user.keyboard('{ArrowUp}')
    expect(names()[2]).toContain('Cruzadas Clube')
    expect(live()).toHaveTextContent('Cruzadas Clube na posição 3 de 4.')
    // O foco continua na alça da mesma fonte depois de mover.
    expect(handle('Cruzadas Clube')).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(names()[3]).toContain('Cruzadas Clube')
    await user.keyboard('{ArrowUp} ')
    expect(handle('Cruzadas Clube')).toHaveAttribute('aria-pressed', 'false')
    expect(live()).toHaveTextContent('Cruzadas Clube solta na posição 3 de 4.')
    expect(names()[2]).toContain('Cruzadas Clube')
  })

  it('keyboard: Esc cancels and puts the order back; losing focus also cancels', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    handle('O Globo').focus()
    await user.keyboard(' {ArrowDown}{ArrowDown}')
    expect(names()[2]).toContain('O Globo')
    await user.keyboard('{Escape}')
    expect(names()[0]).toContain('O Globo')
    expect(live()).toHaveTextContent('Movimento cancelado. O Globo voltou à posição 1 de 4.')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()

    await user.keyboard(' {ArrowDown}')
    expect(names()[1]).toContain('O Globo')
    await user.tab()
    expect(names()[0]).toContain('O Globo')
  })

  it('keyboard: arrows do nothing when not grabbed or at the ends', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    handle('O Globo').focus()
    await user.keyboard('{ArrowDown}')
    expect(names()[0]).toContain('O Globo')
    await user.keyboard(' {ArrowUp}')
    expect(names()[0]).toContain('O Globo')
  })

  it('each handle has a short label and fixed instructions linked with aria-describedby', async () => {
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    const first = handle('O Globo')
    const hint = document.getElementById(first.getAttribute('aria-describedby') ?? '')
    expect(hint).toHaveTextContent(/Espaço pega.*setas.*Esc cancela/)
    for (const name of ['Cruzadas Clube', 'Cruzada Online', 'Cruzadas Brasil']) {
      expect(handle(name).getAttribute('aria-describedby')).toBe(
        first.getAttribute('aria-describedby'),
      )
    }
  })

  it('does not mention the removed "Hoje" cards', async () => {
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    expect(screen.queryByText(/Hoje/)).not.toBeInTheDocument()
  })

  it('saves the visible flags and the order exactly as shown', async () => {
    const user = userEvent.setup()
    const put = vi.fn((body: unknown) => {
      void body
      return jsonResponse(200, {
        sources: [
          { id: 'cruzadaonline', visible: true, position: 0 },
          { id: 'oglobo', visible: false, position: 1 },
          { id: 'cruzadasbrasil', visible: true, position: 2 },
          { id: 'clube', visible: true, position: 3 },
        ],
      })
    })
    setup(put)
    await screen.findByRole('checkbox', { name: /O Globo/ })
    await user.click(screen.getByRole('checkbox', { name: /O Globo/ }))
    handle('O Globo').focus()
    await user.keyboard(' {ArrowDown} ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Salvo\. 3 de 4 fontes visíveis/)).toBeVisible()
    expect(put).toHaveBeenCalledWith({
      sources: [
        { id: 'cruzadaonline', visible: true },
        { id: 'oglobo', visible: false },
        { id: 'cruzadasbrasil', visible: true },
        { id: 'clube', visible: true },
      ],
    })
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('explains clearly when no source would stay visible', async () => {
    const user = userEvent.setup()
    setup(() => apiError(400, 'no-visible-source'))
    await screen.findByRole('checkbox', { name: /O Globo/ })
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pelo menos uma fonte precisa ficar visível. Nada foi alterado.',
    )
  })

  it('discards the edits', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    await user.click(screen.getByRole('checkbox', { name: /O Globo/ }))
    await user.click(screen.getByRole('button', { name: 'Descartar alterações' }))
    expect(screen.getByRole('checkbox', { name: /O Globo/ })).toBeChecked()
  })

  it('has no accessibility violations and works with the keyboard only', async () => {
    const user = userEvent.setup()
    const { container } = setup()
    await screen.findByRole('checkbox', { name: /O Globo/ })
    await expectNoA11yViolations(container)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Arrastar O Globo' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: /O Globo/ })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: /O Globo/ })).not.toBeChecked()
    await user.tab()
    expect(
      within(screen.getAllByRole('listitem')[1]!).getByRole('button', { name: /Arrastar/ }),
    ).toHaveFocus()
  })
})
