import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'
import { jsonResponse, mockApi } from '../../../../test/http'
import { aUser, makeQueryClient } from '../../../../test/render'
import { DayPicker } from './DayPicker'

afterEach(() => vi.restoreAllMocks())

function setup(sources: string[]) {
  const api = mockApi({
    'GET /api/sources': () => jsonResponse(200, { sources }),
    'GET /api/library': () => jsonResponse(200, { items: [] }),
  })
  const client = makeQueryClient()
  client.setQueryData(queryKeys.session, { user: aUser })
  render(
    <QueryClientProvider client={client}>
      <DayPicker selectedId={null} onSelect={() => {}} />
    </QueryClientProvider>,
  )
  return api
}

describe('DayPicker (feature 060)', () => {
  it('offers only the visible sources, opens on the first and never asks for a hidden one', async () => {
    const { calls } = setup(['clube', 'oglobo'])
    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Cruzadas Clube'),
      expect.stringContaining('O Globo'),
    ])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(calls.some((call) => call.key === 'GET /api/library')).toBe(true))
    const asked = calls.filter((call) => call.key === 'GET /api/library').map((call) => call.url)
    expect(
      asked.some((url) => url.includes('cruzadaonline') || url.includes('cruzadasbrasil')),
    ).toBe(false)
  })
})

describe('DayPicker (feature 061)', () => {
  it('has the date filter behind the icon, no "Hoje" section, and picks nothing by itself', async () => {
    const onSelect = vi.fn()
    mockApi({
      'GET /api/sources': () => jsonResponse(200, { sources: ['oglobo'] }),
      'GET /api/library': () => jsonResponse(200, { items: [] }),
    })
    const client = makeQueryClient()
    client.setQueryData(queryKeys.session, { user: aUser })
    render(
      <QueryClientProvider client={client}>
        <DayPicker selectedId={null} onSelect={onSelect} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await screen.findByRole('tab', { name: /O Globo/ })
    expect(screen.queryByRole('heading', { name: 'Hoje' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir para uma data' }))
    const month = (await screen.findByRole('combobox', { name: 'Mês' })) as HTMLSelectElement
    const previous = month.options[1]?.value ?? ''
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: `${previous}-01` } })
    await screen.findByRole('heading', { level: 2 })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
