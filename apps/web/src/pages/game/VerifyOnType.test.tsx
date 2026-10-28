import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSettingsOpen } from '../../features/settings/services/settings-open'
import { getSettings, updateSettings } from '../../shared/services/settings-store/settings-store'
import {
  chooseHelp,
  helpItem,
  installGameTestLifecycle,
  openGame,
  openGuestGame,
  PROGRESS,
  SAVE,
  setup,
} from '../../test/game-harness'
import { cellsFrom, makeProgress } from '../../test/fixtures'
import { jsonResponse } from '../../test/http'
import { desktop, mockMatchMedia, phone } from '../../test/media'

installGameTestLifecycle()

afterEach(() => {
  vi.unstubAllGlobals()
  void act(() => setSettingsOpen(false))
})

const grid = () => screen.getByRole('grid')
const cell = (row: number, col: number) =>
  screen.getByRole('gridcell', { name: new RegExp(`Linha ${row}, coluna ${col},`) })
const isWrong = (row: number, col: number) =>
  cell(row, col).getAttribute('aria-label')?.includes('errada na verificação') ?? false

describe('verificar ao digitar (feature 047)', () => {
  it('desligada, a letra errada não é marcada', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await user.click(grid())
    await user.keyboard('x')
    expect(isWrong(1, 1)).toBe(false)
  })

  it('ligada, marca na hora a letra errada e limpa ao acertar ou apagar', async () => {
    updateSettings({ verifyOnType: true })
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await user.click(grid())
    await user.keyboard('x')
    expect(isWrong(1, 1)).toBe(true)
    await user.keyboard('{Backspace}')
    expect(isWrong(1, 1)).toBe(false)
    await user.keyboard('x')
    expect(isWrong(1, 1)).toBe(true)
    await user.click(cell(1, 1))
    await user.keyboard('c')
    expect(isWrong(1, 1)).toBe(false)
  })

  it('ligar marca as letras já escritas e desligar tira as marcas', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await user.click(grid())
    await user.keyboard('x')
    expect(isWrong(1, 1)).toBe(false)
    updateSettings({ verifyOnType: true })
    expect(await screen.findByRole('gridcell', { name: /letra X, errada/ })).toBeInTheDocument()
    updateSettings({ verifyOnType: false })
    await waitFor(() => expect(isWrong(1, 1)).toBe(false))
  })

  it('com o lápis a letra errada vai ao rascunho sem marca; ao confirmar é marcada', async () => {
    updateSettings({ verifyOnType: true })
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await chooseHelp(user, 'Lápis')
    await user.click(grid())
    await user.keyboard('x')
    expect(screen.getByRole('gridcell', { name: /rascunho X/ })).not.toHaveAccessibleName(/errada/)
    await chooseHelp(user, 'Confirmar rascunho')
    expect(isWrong(1, 1)).toBe(true)
  })

  it('não gasta ajuda nem muda o corpo do salvamento', async () => {
    updateSettings({ verifyOnType: true })
    const user = setup()
    const { calls } = openGame()
    await screen.findByRole('grid')
    await user.click(grid())
    await user.keyboard('x')
    expect(screen.getByText('0/4 Letra')).toBeInTheDocument()
    expect(screen.getByText('0/2 Palavra')).toBeInTheDocument()
    const body = JSON.stringify(calls.filter((call) => call.key === SAVE).map((c) => c.body))
    expect(body).not.toContain('wrong')
    expect(body).not.toContain('verifyOnType')
  })

  it('desligar tira só as marcas automáticas: a marca de "Verificar" fica', async () => {
    const user = setup()
    openGame()
    await screen.findByRole('grid')
    await user.click(grid())
    await user.keyboard('x')
    await chooseHelp(user, 'Verificar')
    expect(isWrong(1, 1)).toBe(true)
    updateSettings({ verifyOnType: true })
    updateSettings({ verifyOnType: false })
    await waitFor(() => expect(isWrong(1, 1)).toBe(true))
  })

  describe('menu Ajudas', () => {
    it('o interruptor do jogo e o dos ajustes são o mesmo valor', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      const button = () => screen.getByRole('button', { name: /^Ajudas/ })
      expect(button()).toHaveAccessibleName('Ajudas')
      await chooseHelp(user, 'Verificar ao digitar')
      expect(getSettings().verifyOnType).toBe(true)
      expect(button()).toHaveAccessibleName('Ajudas, verificação automática ligada')
      expect(await helpItem(user, 'Verificar ao digitar')).toHaveAttribute('aria-checked', 'true')
      act(() => updateSettings({ verifyOnType: false }))
      expect(button()).toHaveAccessibleName('Ajudas')
      expect(await helpItem(user, 'Verificar ao digitar')).toHaveAttribute('aria-checked', 'false')
    })

    it('abrir os ajustes ou os atalhos fecha o menu e, com eles abertos, o botão não o abre', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await helpItem(user, 'Verificar')
      expect(screen.getByRole('menu')).toBeVisible()
      act(() => setSettingsOpen(true))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /^Ajudas/ }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      act(() => setSettingsOpen(false))

      await user.click(screen.getByRole('button', { name: 'Ajudas' }))
      await user.click(screen.getByRole('button', { name: 'Atalhos de teclado' }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeInTheDocument()
    })

    it('teclas com o menu aberto não escrevem no tabuleiro', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await helpItem(user, 'Verificar')
      await user.keyboard('ABC')
      expect(screen.getByRole('gridcell', { name: /Linha 1, coluna 1,/ })).toHaveAccessibleName(
        /vazia/,
      )
    })

    it('pausado, o menu abre, o interruptor funciona e fechar não retoma o relógio', async () => {
      const user = setup()
      openGame()
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: 'Pausar' }))
      expect(await helpItem(user, 'Verificar')).toHaveAttribute('aria-disabled', 'true')
      await user.click(await helpItem(user, 'Verificar ao digitar'))
      expect(getSettings().verifyOnType).toBe(true)
      await user.keyboard('{Escape}')
      expect(screen.getByText('Jogo pausado')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continuar', pressed: true })).toBeInTheDocument()
    })

    it('modo leitura: sem o botão Ajudas e sem marcas novas', async () => {
      updateSettings({ verifyOnType: true })
      openGame({
        [PROGRESS]: () =>
          jsonResponse(200, {
            progress: makeProgress({
              cells: cellsFrom(['CAL', 'A#O', 'SOL']),
              status: 'completed',
              elapsedMs: 1000,
              finishedMs: 1000,
              bestMs: 1000,
              completedAt: '2026-10-14T12:10:00.000Z',
            }),
          }),
      })
      await screen.findByRole('grid')
      expect(screen.queryByRole('button', { name: /^Ajudas/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('gridcell', { name: /errada/ })).not.toBeInTheDocument()
    })

    it('com o teclado na tela o menu usa o painel de baixo', async () => {
      mockMatchMedia(phone)
      const user = setup()
      openGuestGame()
      await screen.findByRole('grid')
      await helpItem(user, 'Verificar')
      expect(screen.getByRole('menu').className).toMatch(/sheet/)
    })

    it('sem o teclado na tela o menu é um popover', async () => {
      mockMatchMedia(desktop)
      const user = setup()
      openGuestGame()
      await screen.findByRole('grid')
      await helpItem(user, 'Verificar')
      expect(screen.getByRole('menu').className).toMatch(/popover/)
    })
  })
})
