import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setUnauthenticatedHandler } from '../../../shared/services/api/client/client'
import { queryKeys } from '../../../shared/services/api/query-keys/query-keys'
import { aUser, makeQueryClient } from '../../../test/render'
import { clearEnded, getSessionEnded } from './session-ended'
import { clearExpired, getSessionExpired } from './session-expired'
import { installSessionHandlers } from './session-handlers'

// O tratador é instalado no cliente de API; aqui ele é capturado para ser chamado direto.
let handler: (() => void) | null = null
vi.mock('../../../shared/services/api/client/client', () => ({
  setUnauthenticatedHandler: vi.fn((next: (() => void) | null) => {
    handler = next
  }),
}))

function install(pathname: string, session: unknown) {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, session)
  const navigate = vi.fn()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  installSessionHandlers({ state: { location: { pathname, search: '' } }, navigate }, queryClient)
  handler?.()
  return { queryClient, navigate, invalidate }
}

beforeEach(() => {
  clearEnded()
  clearExpired()
})

afterEach(() => {
  setUnauthenticatedHandler(null)
})

describe('installSessionHandlers (feature 013)', () => {
  it('fora do tabuleiro, uma conta vira visitante, a biblioteca é buscada de novo e há aviso', () => {
    const { queryClient, navigate, invalidate } = install('/', { user: aUser })
    expect(queryClient.getQueryData(queryKeys.session)).toBeNull()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.libraryAll })
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(getSessionEnded()).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('fora do tabuleiro, para o visitante, não grava, não busca de novo e não avisa', () => {
    const { queryClient, navigate, invalidate } = install('/dia/2026-10-01', null)
    expect(queryClient.getQueryData(queryKeys.session)).toBeNull()
    expect(invalidate).not.toHaveBeenCalled()
    expect(getSessionEnded()).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('no tabuleiro de uma conta, só marca a sessão como expirada', () => {
    const { queryClient, invalidate } = install('/jogo/abc', { user: aUser })
    expect(getSessionExpired()).toEqual({ expired: true, lastUser: aUser })
    expect(queryClient.getQueryData(queryKeys.session)).toEqual({ user: aUser })
    expect(invalidate).not.toHaveBeenCalled()
    expect(getSessionEnded()).toBe(false)
  })

  it('no tabuleiro do visitante, não abre a janela de login', () => {
    install('/jogo/abc', null)
    expect(getSessionExpired().expired).toBe(false)
  })

  it.each(['/login', '/cadastro'])('em %s não faz nada', (pathname) => {
    const { queryClient, invalidate } = install(pathname, { user: aUser })
    expect(queryClient.getQueryData(queryKeys.session)).toEqual({ user: aUser })
    expect(invalidate).not.toHaveBeenCalled()
    expect(getSessionEnded()).toBe(false)
  })
})
