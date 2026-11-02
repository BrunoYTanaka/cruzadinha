import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { jsonResponse, mockApi } from '../../../../test/http'
import { guestStore } from '../../../guest'
import { ImportOffer, resetPostponedImport } from './ImportOffer'

const A = '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a'
const B = '5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b'

const save = (puzzleId: string, status: 'in_progress' | 'completed' = 'in_progress') =>
  guestStore.save({
    puzzleId,
    date: '2026-10-16',
    cells: [['A', null]],
    elapsedMs: 5_000,
    status,
    savedAt: new Date().toISOString(),
    help: null,
  })

const ok = (...ids: string[]) =>
  jsonResponse(200, {
    results: ids.map((puzzleId) => ({ puzzleId, result: 'imported' })),
    imported: ids.length,
    kept: 0,
    rejected: 0,
  })

function view(userId: string | null = 'u1', suspended = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ImportOffer userId={userId} suspended={suspended} />
    </QueryClientProvider>,
  )
}

beforeEach(() => resetPostponedImport())
afterEach(() => vi.unstubAllGlobals())

describe('ImportOffer', () => {
  it('não aparece sem progresso de visitante', async () => {
    view()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não aparece para visitante nem com a oferta suspensa', async () => {
    await save(A)
    view(null)
    view('u1', true)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra o resumo, importa, apaga o local e mostra o resultado', async () => {
    await save(A, 'completed')
    await save(B)
    const api = mockApi({ 'POST /api/progress/import': () => ok(A, B) })
    view()

    const dialog = await screen.findByRole('dialog', {
      name: 'Importar seu progresso de visitante?',
    })
    expect(dialog).toHaveTextContent('2 cruzadas no aparelho')
    expect(dialog).toHaveTextContent('1 concluída')
    expect(dialog).toHaveTextContent('1 em andamento')
    await expectNoA11yViolations(document.body)

    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(await screen.findByRole('dialog', { name: 'Progresso importado' })).toHaveTextContent(
      '2 cruzadas importadas',
    )
    expect(api.calls).toHaveLength(1)
    expect(await guestStore.getAll()).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Agora não" não muda nada e a oferta volta na próxima carga', async () => {
    await save(A)
    const api = mockApi({})
    const first = view()
    await userEvent.click(await screen.findByRole('button', { name: 'Agora não' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
    expect(await guestStore.getAll()).toHaveLength(1)

    first.unmount()
    resetPostponedImport()
    view()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('depois de "Agora não" e de sair da conta, o registro de visitante segue intacto', async () => {
    await save(A)
    const first = view()
    await userEvent.click(await screen.findByRole('button', { name: 'Agora não' }))
    first.unmount()
    view(null)
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await guestStore.getAll()).toHaveLength(1)
  })

  it('descartar pede confirmação, e "Voltar" não apaga', async () => {
    await save(A)
    view()
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    const confirm = screen.getByRole('dialog', { name: 'Descartar o progresso deste aparelho?' })
    expect(confirm).toHaveTextContent('não pode ser desfeito')

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await guestStore.getAll()).toHaveLength(1)
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar mesmo assim' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await guestStore.getAll()).toEqual([])
  })

  it('falha de rede avisa, mantém o progresso e deixa tentar de novo', async () => {
    await save(A)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    view()
    await userEvent.click(await screen.findByRole('button', { name: 'Importar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('continua neste aparelho')
    expect(await guestStore.getAll()).toHaveLength(1)

    mockApi({ 'POST /api/progress/import': () => ok(A) })
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('dialog', { name: 'Progresso importado' })).toBeInTheDocument()
    expect(await guestStore.getAll()).toEqual([])
  })
})
