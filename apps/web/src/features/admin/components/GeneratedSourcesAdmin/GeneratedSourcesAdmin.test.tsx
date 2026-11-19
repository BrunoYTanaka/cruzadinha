import type { GeneratedSourceView } from '@cruzadinha/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../../../test/axe'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { makeQueryClient } from '../../../../test/render'
import { GeneratedSourcePanel } from './GeneratedSourcesAdmin'

const PUZZLE_ID = '0b7d6c43-6f1d-4f6c-9a50-2f0d3a1b9c11'
const COMMAND = 'gh workflow run collect.yml'

type Today = NonNullable<GeneratedSourceView['today']>

const today = (overrides: Partial<Today> = {}): Today => ({
  puzzleId: PUZZLE_ID,
  size: 11,
  difficulty: 'medium',
  discardable: true,
  blockedBy: null,
  words: [
    { number: 1, direction: 'across', answer: 'SOL', clue: 'Estrela do dia' },
    { number: 3, direction: 'across', answer: 'MAR', clue: 'Água salgada' },
    { number: 1, direction: 'down', answer: 'SAL', clue: 'Tempero' },
    { number: 2, direction: 'down', answer: 'LUA', clue: 'Brilha à noite' },
  ],
  ...overrides,
})

const view = (overrides: Partial<GeneratedSourceView> = {}): GeneratedSourceView => ({
  source: 'casa',
  gridSize: 11,
  difficulty: 'medium',
  callsLeft: 2,
  today: today(),
  ...overrides,
})

function setup(handlers: Parameters<typeof mockApi>[0] = {}, initial = view()) {
  const api = mockApi({
    'GET /api/admin/generated': () => jsonResponse(200, { sources: [initial] }),
    ...handlers,
  })
  const rendered = render(
    <QueryClientProvider client={makeQueryClient()}>
      <GeneratedSourcePanel view={initial} />
    </QueryClientProvider>,
  )
  return { ...api, ...rendered }
}

async function confirmDiscard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Descartar' }))
  const dialog = screen.getByRole('dialog', { name: 'Descartar a cruzada de hoje?' })
  await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))
}

const term = (name: string) => screen.getByText(name, { selector: 'dt' }).nextElementSibling

afterEach(() => vi.restoreAllMocks())

describe('GeneratedSourcePanel: configuração (features 064 e 066)', () => {
  it('mostra título, Contador e dificuldade, sem aviso reservado', async () => {
    const { container } = setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Casa' })).toBeInTheDocument()
    expect(
      screen.getByText('Fonte gerada. O jogador vê só o nome da fonte e a dificuldade.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Configuração' })).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).toBeNull()
    const group = screen.getByRole('group', { name: 'Tamanho da grade' })
    expect(within(group).getByRole('status')).toHaveTextContent('11 × 11')
    expect(screen.getByRole('radio', { name: 'Médio' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Fácil' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Difícil' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Descartar alterações' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Salvo\./)).toBeNull()
    await expectNoA11yViolations(container)
  })

  it('desliga diminuir em 9 e aumentar em 15', () => {
    setup({}, view({ gridSize: 9 }))
    expect(screen.getByRole('button', { name: 'Diminuir a grade' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aumentar a grade' })).toBeEnabled()
  })

  it('desliga aumentar em 15', () => {
    setup({}, view({ gridSize: 15 }))
    expect(screen.getByRole('button', { name: 'Aumentar a grade' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Diminuir a grade' })).toBeEnabled()
  })

  it('"+" liga Salvar e Descartar alterações, que volta ao salvo', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Aumentar a grade' }))
    expect(screen.getByRole('group', { name: 'Tamanho da grade' })).toHaveTextContent('12 × 12')
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: 'Difícil' }))
    await user.click(screen.getByRole('button', { name: 'Descartar alterações' }))
    expect(screen.getByRole('group', { name: 'Tamanho da grade' })).toHaveTextContent('11 × 11')
    expect(screen.getByRole('radio', { name: 'Médio' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Descartar alterações' })).toBeNull()
  })

  it('salva e mostra o aviso na linha dos botões', async () => {
    const user = userEvent.setup()
    const { calls } = setup({
      'PUT /api/admin/generated/settings': () =>
        jsonResponse(200, view({ gridSize: 12, difficulty: 'hard' })),
    })
    await user.click(screen.getByRole('button', { name: 'Aumentar a grade' }))
    await user.click(screen.getByRole('radio', { name: 'Difícil' }))
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }))
    const notice = await screen.findByText('Salvo. Vale a partir da próxima cruzada gerada.')
    const row = screen.getByRole('button', { name: 'Salvar configuração' }).parentElement
    expect(row).toContainElement(notice)
    expect(calls.find((call) => call.key === 'PUT /api/admin/generated/settings')?.body).toEqual({
      source: 'casa',
      gridSize: 12,
      difficulty: 'hard',
    })
  })

  it('erro ao salvar aparece no mesmo lugar e mantém o rascunho', async () => {
    const user = userEvent.setup()
    setup({ 'PUT /api/admin/generated/settings': () => apiError(500, 'internal') })
    await user.click(screen.getByRole('button', { name: 'Aumentar a grade' }))
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Nada foi alterado')
    expect(
      screen.getByRole('button', { name: 'Salvar configuração' }).parentElement,
    ).toContainElement(alert)
    expect(screen.getByRole('group', { name: 'Tamanho da grade' })).toHaveTextContent('12 × 12')
  })
})

describe('GeneratedSourcePanel: cruzada de hoje (feature 066)', () => {
  it('mostra resumo, tabelas e zona de perigo', async () => {
    const { container } = setup()
    expect(screen.getByRole('heading', { level: 3, name: 'Cruzada de hoje' })).toBeInTheDocument()
    expect(term('Grade')).toHaveTextContent('11 × 11')
    expect(term('Dificuldade')).toHaveTextContent('Médio')
    expect(term('Palavras')).toHaveTextContent('4')
    expect(term('Chamadas restantes')).toHaveTextContent('2 de 3')
    const across = screen.getByRole('table', { name: 'Horizontais' })
    expect(
      within(across)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Nº', 'Resposta', 'Dica'])
    expect(within(across).getAllByRole('row')[1]).toHaveTextContent('1SOLEstrela do dia')
    expect(
      within(screen.getByRole('table', { name: 'Verticais' })).getAllByRole('row'),
    ).toHaveLength(3)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Descartar a cruzada de hoje' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ela sai do site para todos. A próxima coleta gera outra.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeEnabled()
    expect(container.textContent).not.toContain('`')
    await expectNoA11yViolations(container)
  })

  it('mostra "—" quando a API não informa a dificuldade da geração', () => {
    setup({}, view({ today: { ...today(), difficulty: undefined } }))
    expect(term('Dificuldade')).toHaveTextContent('—')
  })

  it('avisa que o dia ficará vazio quando as chamadas acabaram', () => {
    setup({}, view({ callsLeft: 0 }))
    expect(
      screen.getByText(
        'Ela sai do site para todos. As chamadas de hoje acabaram: o dia ficará sem cruzada.',
      ),
    ).toBeInTheDocument()
    expect(term('Chamadas restantes')).toHaveTextContent('0 de 3')
  })

  it.each([
    ['duel', 'Um x1 usa esta cruzada.'],
    ['progress', 'Uma conta já começou esta cruzada.'],
  ] as const)('em uso por %s: selo com o motivo e Descartar desligado', (blockedBy, text) => {
    setup({}, view({ today: today({ discardable: false, blockedBy }) }))
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled()
  })

  it('cancelar no diálogo não descarta', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(calls.some((call) => call.key === 'POST /api/admin/generated/discard')).toBe(false)
  })

  it('descarta e oferece o comando num campo com Copiar', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { calls, container } = setup({
      'POST /api/admin/generated/discard': () => jsonResponse(200, { discarded: true }),
    })
    await confirmDiscard(user)
    expect(
      await screen.findByText('Cruzada descartada. A próxima coleta gera outra. Para gerar agora:'),
    ).toBeInTheDocument()
    // O botão sumiu com a cruzada: o foco fica no resultado.
    await waitFor(() =>
      expect(
        screen
          .getByText('Cruzada descartada. A próxima coleta gera outra. Para gerar agora:')
          .closest('[tabindex="-1"]'),
      ).toHaveFocus(),
    )
    const field = screen.getByRole('textbox', { name: 'Comando para gerar agora' })
    expect(field).toHaveValue(COMMAND)
    expect(field).toHaveAttribute('readonly')
    expect(container.textContent).not.toContain('`')
    await waitFor(() =>
      expect(calls.find((call) => call.key === 'POST /api/admin/generated/discard')?.body).toEqual({
        source: 'casa',
        puzzleId: PUZZLE_ID,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Copiar' }))
    expect(writeText).toHaveBeenCalledWith(COMMAND)
    expect(await screen.findByText('Comando copiado.')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('diz para selecionar o comando quando o navegador recusa copiar', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('negado'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    setup({ 'POST /api/admin/generated/discard': () => jsonResponse(200, { discarded: true }) })
    await confirmDiscard(user)
    await user.click(await screen.findByRole('button', { name: 'Copiar' }))
    expect(
      await screen.findByText('Não foi possível copiar. Selecione o comando.'),
    ).toBeInTheDocument()
  })

  it('sem chamadas, o descarte avisa o dia vazio e não mostra comando', async () => {
    const user = userEvent.setup()
    setup(
      { 'POST /api/admin/generated/discard': () => jsonResponse(200, { discarded: true }) },
      view({ callsLeft: 0 }),
    )
    await confirmDiscard(user)
    expect(
      await screen.findByText(
        'Cruzada descartada. As chamadas de hoje acabaram: o dia ficará sem cruzada.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('mostra o erro quando a cruzada passou a ser usada', async () => {
    const user = userEvent.setup()
    setup({ 'POST /api/admin/generated/discard': () => apiError(409, 'in-use') })
    await confirmDiscard(user)
    expect(
      await screen.findByText(
        'A cruzada passou a ser usada por uma conta ou um x1. Nada foi descartado.',
      ),
    ).toBeInTheDocument()
  })

  it('sem cruzada hoje, só chamadas e o aviso', async () => {
    const { container } = setup({}, view({ today: null }))
    expect(screen.getByText('Sem cruzada hoje.')).toBeInTheDocument()
    expect(term('Chamadas restantes')).toHaveTextContent('2 de 3')
    expect(screen.queryByText('Grade', { selector: 'dt' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull()
    await expectNoA11yViolations(container)
  })
})
