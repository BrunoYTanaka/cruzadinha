import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../api/query-keys'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient } from '../../test/render'
import { ReloginDialog } from './ReloginDialog'
import { SessionExpiredNotice } from './SessionExpiredNotice'
import { clearExpired, markExpired } from '../../app/session-expired'

function Harness({ onSuccess = () => {} }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div id="root">
      <button onClick={() => setOpen(true)}>Entrar de novo</button>
      <ReloginDialog
        open={open}
        onClose={() => setOpen(false)}
        expectedUser={aUser}
        onSuccess={() => {
          setOpen(false)
          onSuccess()
        }}
      />
    </div>
  )
}

function renderDialog(ui: React.ReactElement) {
  const queryClient = makeQueryClient()
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  return queryClient
}

describe('ReloginDialog', () => {
  it('abre sobre a tela com o e-mail da conta da partida somente leitura', async () => {
    const user = userEvent.setup()
    renderDialog(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    const email = screen.getByLabelText('E-mail')
    expect(email).toHaveValue(aUser.email)
    expect(email).toHaveAttribute('readonly')
    await expectNoA11yViolations(document.body)
  })

  it('mostra a mensagem genérica com a senha errada e a espera em 429', async () => {
    const user = userEvent.setup()
    let attempts = 0
    mockApi({
      'POST /api/auth/login': () =>
        ++attempts === 1
          ? apiError(401, 'invalid-credentials')
          : jsonResponse(
              429,
              { error: 'too-many-attempts', message: 'x' },
              { 'retry-after': '45' },
            ),
    })
    renderDialog(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    await user.type(screen.getByLabelText('Senha'), 'errada123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Muitas tentativas. Tente de novo em 45 s.',
      ),
    )
  })

  it('no sucesso fecha a janela, atualiza a sessão e chama o onSuccess', async () => {
    const user = userEvent.setup()
    mockApi({ 'POST /api/auth/login': () => jsonResponse(200, { user: aUser }) })
    const onSuccess = vi.fn()
    const queryClient = renderDialog(<Harness onSuccess={onSuccess} />)
    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(queryClient.getQueryData(queryKeys.session)).toEqual({ user: aUser })
  })

  it('se o login devolver outra conta, encerra essa sessão e mantém o jogo', async () => {
    const user = userEvent.setup()
    const { calls } = mockApi({
      'POST /api/auth/login': () =>
        jsonResponse(200, {
          user: { id: '11111111-1111-4111-8111-111111111111', email: 'outra@exemplo.com' },
        }),
      'POST /api/auth/logout': () => jsonResponse(204),
    })
    const onSuccess = vi.fn()
    const queryClient = renderDialog(<Harness onSuccess={onSuccess} />)
    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Entre com a conta desta partida.')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(calls.some((call) => call.key === 'POST /api/auth/logout')).toBe(true)
    expect(queryClient.getQueryData(queryKeys.session)).toBeUndefined()
  })

  it('Esc fecha e o foco volta ao botão de origem, sem perder o aviso', async () => {
    const user = userEvent.setup()
    renderDialog(<Harness />)
    const opener = screen.getByRole('button', { name: 'Entrar de novo' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})

describe('SessionExpiredNotice', () => {
  it('só aparece com a sessão expirada e abre o login por cima do jogo', async () => {
    clearExpired()
    const user = userEvent.setup()
    renderDialog(
      <div id="root">
        <p>Tabuleiro</p>
        <SessionExpiredNotice />
      </div>,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    markExpired(aUser)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sua sessão expirou. Entre de novo para salvar.',
    )
    await user.click(screen.getByRole('button', { name: 'Entrar de novo' }))
    expect(screen.getByRole('dialog', { name: 'Entrar de novo' })).toBeInTheDocument()
    expect(screen.getByText('Tabuleiro')).toBeInTheDocument()
    clearExpired()
  })
})
