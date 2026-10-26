import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../api/query-keys'
import { AppLayout } from '../../app/AppLayout'
import { expectNoA11yViolations } from '../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../test/http'
import { aUser, makeQueryClient, renderRoutes, resetSessionHandlers } from '../../test/render'
import { SourcePicker } from './SettingsDialog'
import { getSettings, settingsDefaults, updateSettings } from './settings-store'

const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <p>Calendário</p> },
      { path: '/login', element: <p>Tela de login</p> },
    ],
  },
]

function asGuest() {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(queryKeys.session, null)
  return renderRoutes(routes, ['/'], queryClient)
}

async function openSettings() {
  const user = userEvent.setup()
  const view = asGuest()
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  const dialog = screen.getByRole('dialog', { name: 'Configurações' })
  return { user, dialog, ...view }
}

afterEach(() => {
  resetSessionHandlers()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('engrenagem do cabeçalho', () => {
  it('tem nome, tooltip e abre a modal; o botão de tema antigo saiu', async () => {
    const user = userEvent.setup()
    asGuest()
    const gear = await screen.findByRole('button', { name: 'Configurações' })
    expect(gear).toHaveAttribute('aria-haspopup', 'dialog')
    expect(screen.queryByRole('button', { name: /Trocar tema/ })).toBeNull()
    await user.hover(gear)
    expect(screen.getByText('Configurações', { selector: '[data-tooltip]' })).toBeInTheDocument()
    await user.click(gear)
    expect(screen.getByRole('dialog', { name: 'Configurações' })).toBeInTheDocument()
  })

  it('Esc e o botão Fechar fecham e devolvem o foco à engrenagem', async () => {
    const { user, dialog } = await openSettings()
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Configurações' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Configurações' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Configurações' })).toHaveFocus()
  })
})

describe('fechar ao clicar fora (feature 032)', () => {
  it('clicar fora do painel fecha e devolve o foco à engrenagem', async () => {
    const { dialog } = await openSettings()
    const backdrop = dialog.parentElement as HTMLElement
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Configurações' })).toHaveFocus()
  })

  it('clicar dentro do painel não fecha', async () => {
    const { user, dialog } = await openSettings()
    await user.click(within(dialog).getByRole('heading', { name: 'Configurações' }))
    await user.click(dialog)
    expect(screen.getByRole('dialog', { name: 'Configurações' })).toBeInTheDocument()
  })

  it('arrastar de dentro para fora não fecha: o toque tem de começar fora', async () => {
    const { dialog } = await openSettings()
    fireEvent.pointerDown(within(dialog).getByRole('heading', { name: 'Configurações' }))
    fireEvent.pointerUp(dialog.parentElement as HTMLElement)
    fireEvent.click(dialog.parentElement as HTMLElement)
    expect(screen.getByRole('dialog', { name: 'Configurações' })).toBeInTheDocument()
  })
})

describe('modal de configurações', () => {
  it('tem o botão de tema e nenhum botão "Salvar"', async () => {
    const { dialog } = await openSettings()
    expect(within(dialog).getByRole('button', { name: /^Tema:/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Salvar/ })).toBeNull()
  })

  it('− e + mudam os limites dentro de 0 a 99', async () => {
    const { user, dialog } = await openSettings()
    const letters = settingsDefaults().helpLetters ?? 0
    await user.click(within(dialog).getByRole('button', { name: 'Mais letras' }))
    expect(getSettings().helpLetters).toBe(letters + 1)
    await user.click(within(dialog).getByRole('button', { name: 'Menos palavras' }))
    expect(getSettings().helpWords).toBe((settingsDefaults().helpWords ?? 1) - 1)

    act(() => updateSettings({ helpWords: 0 }))
    expect(within(dialog).getByRole('button', { name: 'Menos palavras' })).toBeDisabled()
    act(() => updateSettings({ helpLetters: 99 }))
    expect(within(dialog).getByRole('button', { name: 'Mais letras' })).toBeDisabled()
  })

  it('"Sem limite" grava null e desliga − e +; desmarcar volta ao último número', async () => {
    const { user, dialog } = await openSettings()
    act(() => updateSettings({ helpLetters: 6 }))
    const group = within(dialog).getByRole('group', { name: 'Letras' })
    await user.click(within(group).getByRole('checkbox', { name: 'Sem limite' }))
    expect(getSettings().helpLetters).toBeNull()
    expect(within(group).getByRole('button', { name: 'Mais letras' })).toBeDisabled()
    expect(within(group).getByText('Sem limite', { selector: 'output' })).toBeInTheDocument()
    await user.click(within(group).getByRole('checkbox', { name: 'Sem limite' }))
    expect(getSettings().helpLetters).toBe(6)
  })

  it('o switch de riscar muda aria-checked e a descrição', async () => {
    const { user, dialog } = await openSettings()
    const strike = within(dialog).getByRole('switch', { name: 'Riscar a dica só quando acerta' })
    expect(strike).toHaveAttribute('aria-checked', 'true')
    await user.click(strike)
    expect(strike).toHaveAttribute('aria-checked', 'false')
    expect(getSettings().strikeMode).toBe('filled')
    expect(within(dialog).getByText(/certa ou errada/)).toBeInTheDocument()
  })

  it('o switch de copiar a dica vem desligado e grava copyClue (feature 032)', async () => {
    const { user, dialog } = await openSettings()
    const copy = within(dialog).getByRole('switch', { name: 'Copiar a dica' })
    expect(copy).toHaveAttribute('aria-checked', 'false')
    expect(getSettings().copyClue).toBe(false)
    await user.click(copy)
    expect(copy).toHaveAttribute('aria-checked', 'true')
    expect(getSettings().copyClue).toBe(true)
    expect(
      JSON.parse(window.localStorage.getItem('cruzadinha:settings') ?? '{}').settings,
    ).toMatchObject({
      copyClue: true,
    })
  })

  it('Restaurar padrões volta tudo', async () => {
    const { user, dialog } = await openSettings()
    act(() =>
      updateSettings({ helpLetters: null, strikeMode: 'filled', theme: 'dark', copyClue: true }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Restaurar padrões' }))
    expect(getSettings()).toEqual(settingsDefaults())
  })

  it('o visitante vê que fica só neste aparelho, com link para entrar', async () => {
    const { dialog } = await openSettings()
    expect(within(dialog).getByText(/ficam só neste aparelho/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Entre' })).toHaveAttribute('href', '/login')
  })

  it('não tem violações de acessibilidade nos dois temas', async () => {
    await openSettings()
    await expectNoA11yViolations(document.body)
    document.documentElement.setAttribute('data-theme', 'dark')
    await expectNoA11yViolations(document.body)
  })
})

describe('cruzada padrão e ir direto ao jogo (US2)', () => {
  it('com as quatro fontes reais, é uma lista de rádios com a primeira marcada', async () => {
    const { user, dialog } = await openSettings()
    const group = within(dialog).getByRole('group', { name: 'Cruzada padrão' })
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.parentElement?.textContent),
    ).toHaveLength(4)
    const oglobo = within(group).getByRole('radio', { name: 'O Globo' })
    const cruzada = within(group).getByRole('radio', { name: 'Cruzada Online' })
    expect(oglobo).toBeChecked()
    await user.click(cruzada)
    expect(getSettings().defaultSource).toBe('cruzadaonline')
    expect(cruzada).toBeChecked()
  })

  it('a terceira e a quarta fonte (Cruzadas Brasil e Cruzadas Clube) podem ser a padrão', async () => {
    const { user, dialog } = await openSettings()
    const group = within(dialog).getByRole('group', { name: 'Cruzada padrão' })
    await user.click(within(group).getByRole('radio', { name: 'Cruzadas Brasil' }))
    expect(getSettings().defaultSource).toBe('cruzadasbrasil')
    await user.click(within(group).getByRole('radio', { name: 'Cruzadas Clube' }))
    expect(getSettings().defaultSource).toBe('clube')
    expect(within(group).getByRole('radio', { name: 'Cruzadas Clube' })).toBeChecked()
  })

  it('com mais de 3 fontes, vira uma lista de rádios (FR-012a)', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    const onChange = vi.fn()
    const sources = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: `Fonte ${id}` }))
    const { container } = render(<SourcePicker sources={sources} value="b" onChange={onChange} />)
    const group = screen.getByRole('group', { name: 'Cruzada padrão' })
    expect(within(group).getAllByRole('radio')).toHaveLength(4)
    expect(within(group).getByRole('radio', { name: 'Fonte b' })).toBeChecked()
    await user.click(within(group).getByRole('radio', { name: 'Fonte d' }))
    expect(onChange).toHaveBeenCalledWith('d')
    await expectNoA11yViolations(container)
  })

  // Destaque deslizante (feature 024): o contêiner guarda o índice da fonte marcada e a quantidade.
  describe('destaque do seletor', () => {
    const names = (count: number) =>
      ['a', 'b', 'c'].slice(0, count).map((id) => ({ id, name: `Fonte ${id}` }))
    const group = () => screen.getByRole('group', { name: 'Cruzada padrão' })
    const thumb = (container: HTMLElement) => container.querySelector('[data-thumb]')

    it('com 2 e 3 fontes, --i acompanha a fonte marcada e --count a quantidade', () => {
      const { container, rerender } = render(
        <SourcePicker sources={names(3)} value="b" onChange={() => {}} />,
      )
      expect(group().style.getPropertyValue('--i')).toBe('1')
      expect(group().style.getPropertyValue('--count')).toBe('3')
      expect(thumb(container)).toHaveAttribute('aria-hidden', 'true')
      rerender(<SourcePicker sources={names(3)} value="c" onChange={() => {}} />)
      expect(group().style.getPropertyValue('--i')).toBe('2')
      rerender(<SourcePicker sources={names(2)} value="a" onChange={() => {}} />)
      expect(group().style.getPropertyValue('--i')).toBe('0')
      expect(group().style.getPropertyValue('--count')).toBe('2')
    })

    it('escolher outra fonte chama onChange e o índice segue o valor', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { rerender } = render(<SourcePicker sources={names(2)} value="a" onChange={onChange} />)
      await user.click(screen.getByRole('button', { name: 'Fonte b' }))
      expect(onChange).toHaveBeenCalledWith('b')
      rerender(<SourcePicker sources={names(2)} value="b" onChange={onChange} />)
      expect(group().style.getPropertyValue('--i')).toBe('1')
    })

    it('um valor desconhecido vale como a primeira fonte', () => {
      render(<SourcePicker sources={names(2)} value="zzz" onChange={() => {}} />)
      expect(group().style.getPropertyValue('--i')).toBe('0')
    })

    it('com 1 fonte não há destaque', () => {
      const { container } = render(
        <SourcePicker sources={names(1)} value="a" onChange={() => {}} />,
      )
      expect(thumb(container)).toBeNull()
    })
  })

  it('o switch "Ir direto ao jogo" cita a cruzada padrão', async () => {
    const { user, dialog } = await openSettings()
    act(() => updateSettings({ defaultSource: 'cruzadaonline' }))
    expect(within(dialog).getByText(/cruzada de hoje de Cruzada Online/)).toBeInTheDocument()
    const direct = within(dialog).getByRole('switch', { name: 'Ir direto ao jogo' })
    expect(direct).toHaveAttribute('aria-checked', 'false')
    await user.click(direct)
    expect(getSettings().directToGame).toBe(true)
  })
})

describe('com conta (US3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function asUser(saveStatus: number) {
    const api = mockApi({
      'GET /api/settings': () => jsonResponse(200, { settings: null, savedAt: null }),
      'PUT /api/settings': ({ body }) =>
        saveStatus === 200 ? jsonResponse(200, body) : apiError(saveStatus, 'service-unavailable'),
    })
    const queryClient = makeQueryClient()
    queryClient.setQueryData(queryKeys.session, { user: aUser })
    renderRoutes(routes, ['/'], queryClient)
    return api
  }

  it('o rodapé diz que fica no aparelho e na conta', async () => {
    const user = userEvent.setup()
    asUser(200)
    await user.click(await screen.findByRole('button', { name: 'Configurações' }))
    const dialog = screen.getByRole('dialog', { name: 'Configurações' })
    expect(
      within(dialog).getByText('Salvo automaticamente neste aparelho e na sua conta.'),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'Entre' })).toBeNull()
  })

  it('falha ao salvar na conta mostra o aviso e a modal continua usável', async () => {
    const user = userEvent.setup()
    const { calls } = asUser(503)
    await user.click(await screen.findByRole('button', { name: 'Configurações' }))
    const dialog = screen.getByRole('dialog', { name: 'Configurações' })
    await waitFor(() => expect(calls.some((call) => call.key === 'PUT /api/settings')).toBe(true))
    await user.click(within(dialog).getByRole('switch', { name: 'Riscar a dica só quando acerta' }))
    expect(
      await within(dialog).findByText(/Não foi possível salvar na sua conta agora/, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument()
    expect(getSettings().strikeMode).toBe('filled')
    await user.click(within(dialog).getByRole('button', { name: 'Mais letras' }))
    expect(getSettings().helpLetters).toBe((settingsDefaults().helpLetters ?? 0) + 1)
  })
})
