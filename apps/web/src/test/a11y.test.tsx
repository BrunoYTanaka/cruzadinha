import { screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { expectNoA11yViolations } from './axe'
import { cellsFrom, makeProgress } from './fixtures'
import { installGameTestLifecycle, openGame, PROGRESS, setup as setupGame } from './game-harness'
import { apiError, jsonResponse, mockApi } from './http'
import { renderRoutes, resetSessionHandlers } from './render'

installGameTestLifecycle()

afterEach(() => {
  resetSessionHandlers()
})

const authRoutes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '/', element: <p>Biblioteca</p> },
]

describe('acessibilidade (axe, sem a regra de contraste: ela fica no teste dos tokens e no navegador)', () => {
  it('Login', async () => {
    mockApi({ 'GET /api/auth/me': () => apiError(401, 'unauthenticated') })
    const { container } = renderRoutes(authRoutes, ['/login'])
    await screen.findByRole('button', { name: 'Entrar' })
    await expectNoA11yViolations(container)
  })

  it('Cadastro', async () => {
    mockApi({
      'GET /api/auth/me': () => apiError(401, 'unauthenticated'),
      'GET /api/auth/registration': () => jsonResponse(200, { open: true }),
    })
    const { container } = renderRoutes(authRoutes, ['/cadastro'])
    await screen.findByRole('button', { name: 'Criar conta' })
    await expectNoA11yViolations(container)
  })

  it('Jogo, com a legenda aberta', async () => {
    const user = setupGame()
    const { container } = openGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('button', { name: 'Legenda do tabuleiro' }))
    await expectNoA11yViolations(container)
  })

  it('Jogo em modo leitura', async () => {
    const { container } = openGame({
      [PROGRESS]: () =>
        jsonResponse(200, {
          progress: makeProgress({
            cells: cellsFrom(['CAL', 'A#O', 'SOL']),
            status: 'completed',
            finishedMs: 30_000,
            elapsedMs: 30_000,
            bestMs: 30_000,
          }),
        }),
    })
    await screen.findByText('Concluída em 00:30')
    await expectNoA11yViolations(container)
  })

  it('Janela de conclusão', async () => {
    const user = setupGame()
    openGame()
    await screen.findByRole('grid')
    await user.click(screen.getByRole('grid'))
    await user.keyboard('CAL{ArrowDown}OL')
    await user.click(screen.getByRole('gridcell', { name: 'Linha 2, coluna 1, vazia' }))
    await user.keyboard('AS{ArrowRight}O')
    const dialog = await screen.findByRole('dialog', { name: 'Cruzada concluída' })
    await expectNoA11yViolations(dialog)
  })
})

describe('movimento', () => {
  it('global.css zera animações e transições com prefers-reduced-motion', () => {
    const css = readFileSync(join(import.meta.dirname, '..', 'themes', 'global.css'), 'utf8')
    const block = css.slice(css.indexOf('prefers-reduced-motion: reduce'))
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
  })
})
