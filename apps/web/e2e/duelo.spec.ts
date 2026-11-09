import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { fillSolution, resetAndSeed, todaySolution } from './support'

test.beforeEach(async () => {
  await resetAndSeed()
})

// Dois jogadores em contextos separados: cada um tem o próprio armazenamento, como duas pessoas.
async function person(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  return { context, page: await context.newPage() }
}

// Visitante cria um x1 com a cruzada de hoje e devolve o link do convite e o de retorno.
async function createDuel(page: Page, nickname = 'Ana') {
  let interactions = 0
  await page.goto('/x1/novo')
  await page.getByRole('button', { name: /^Hoje, / }).click()
  interactions += 1
  await page.getByLabel('5. Seu apelido').fill(nickname)
  interactions += 1
  await page.getByRole('button', { name: 'Criar x1' }).click()
  interactions += 1
  await expect(page.getByRole('heading', { name: 'x1 criado' })).toBeVisible()
  // SC-001: no máximo 6 interações do calendário ao link e ao código.
  expect(interactions).toBeLessThanOrEqual(6)
  const origin = new URL(page.url()).origin
  const values = await page.locator('p').allTextContents()
  const invite = values.find((text) => text.startsWith(`${origin}/x1/`) && !text.includes('#p='))
  const back = values.find((text) => text.includes('#p='))
  const code = values.find((text) => /^[2-9A-HJKMNP-Z]{8}$/.test(text))
  if (!invite || !back || !code) throw new Error('link, código ou retorno não apareceram')
  return { invite, back, code }
}

async function begin(page: Page) {
  await page.getByRole('button', { name: 'Começar a minha partida' }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

async function accept(page: Page, invite: string, nickname = 'Beto') {
  await page.goto(invite)
  const dialog = page.getByRole('dialog', { name: /desafiou você/ })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Seu apelido').fill(nickname)
  await dialog.getByRole('button', { name: 'Começar' }).click()
  await expect(page.getByRole('grid')).toBeVisible()
}

test('dois jogadores: criar, aceitar, terminar em ordens diferentes e ver o resultado', async ({
  browser,
  request,
}) => {
  const ana = await person(browser)
  const beto = await person(browser)
  const { invite } = await createDuel(ana.page)
  await ana.page.getByRole('link', { name: 'Abrir o meu x1' }).click()
  await begin(ana.page)

  // O convite abre uma janela que não fecha por Esc nem por clique fora.
  await beto.page.goto(invite)
  const dialog = beto.page.getByRole('dialog', { name: /desafiou você/ })
  await expect(dialog).toBeVisible()
  await beto.page.keyboard.press('Escape')
  await beto.page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  expect(
    (await new AxeBuilder({ page: beto.page }).exclude('[role="grid"]').analyze()).violations,
  ).toEqual([])
  await dialog.getByLabel('Seu apelido').fill('Beto')
  await dialog.getByRole('button', { name: 'Começar' }).click()
  await expect(beto.page.getByRole('grid')).toBeVisible()

  const solution = await todaySolution(request)
  await fillSolution(beto.page, solution)
  // Quem termina primeiro espera, sem ver o tempo do outro.
  await expect(beto.page.getByRole('heading', { name: 'Aguardando o oponente' })).toBeVisible()
  await expect(beto.page.getByRole('table')).toHaveCount(0)

  await fillSolution(ana.page, solution)
  const headline = ana.page.getByRole('heading', { level: 1 })
  await expect(headline).toHaveText(/Você venceu!|Você perdeu\.|Empate!/)
  await expect(ana.page.getByRole('table')).toContainText('Beto')
  // O outro lado chega ao resultado pela consulta periódica.
  await expect(beto.page.getByRole('table')).toContainText('Ana', { timeout: 20_000 })

  await ana.context.close()
  await beto.context.close()
})

test('desistir: confirma, perde na hora e o outro vence', async ({ browser }) => {
  const ana = await person(browser)
  const beto = await person(browser)
  const { invite } = await createDuel(ana.page)
  await accept(beto.page, invite)

  await beto.page.getByRole('button', { name: 'Desistir' }).click()
  const confirm = beto.page.getByRole('dialog', { name: 'Desistir deste x1?' })
  await expect(confirm).toContainText('não pode ser desfeito')
  await confirm.getByRole('button', { name: 'Desistir' }).click()
  await expect(beto.page.getByRole('heading', { name: 'Você perdeu.' })).toBeVisible()

  await ana.page.goto(invite)
  await expect(ana.page.getByRole('heading', { name: 'Você venceu!' })).toBeVisible()
  await ana.context.close()
  await beto.context.close()
})

test('cancelar só enquanto aberto, com confirmação', async ({ browser }) => {
  const ana = await person(browser)
  const { invite } = await createDuel(ana.page)
  await ana.page.goto(invite)
  await ana.page.getByRole('button', { name: 'Cancelar x1' }).click()
  await ana.page
    .getByRole('dialog', { name: 'Cancelar este x1?' })
    .getByRole('button', { name: 'Cancelar o x1' })
    .click()
  await expect(ana.page.getByRole('heading', { name: 'Este x1 foi cancelado.' })).toBeVisible()
  await ana.context.close()
})

test('recarregar não reinicia o relógio e as configurações não o pausam', async ({ browser }) => {
  const ana = await person(browser)
  const { invite } = await createDuel(ana.page)
  await ana.page.goto(invite)
  await begin(ana.page)
  const timer = ana.page.getByRole('timer')
  await ana.page.waitForTimeout(3500)
  await ana.page.reload()
  await expect(ana.page.getByRole('grid')).toBeVisible()
  // O tempo continua de onde estava, contado pelo servidor.
  await expect(timer).toHaveText(/^00:0[3-9]$|^00:[1-5]\d$/)

  await ana.page.getByRole('button', { name: /Configurações/ }).click()
  const before = await timer.textContent()
  await ana.page.waitForTimeout(2200)
  await ana.page.keyboard.press('Escape')
  const after = await timer.textContent()
  expect(after).not.toBe(before)
  await ana.context.close()
})

test('entrar por código e "Meus x1": voltar pelo aparelho e pelo link de retorno', async ({
  browser,
}) => {
  const ana = await person(browser)
  const beto = await person(browser)
  const { code, back } = await createDuel(ana.page)

  // Código digitado em "Meus x1" abre a janela de regras; nada muda até clicar em "Começar".
  await beto.page.goto('/x1')
  await beto.page.getByLabel('Código ou link do x1').fill(code.toLowerCase())
  await beto.page.getByRole('button', { name: 'Entrar' }).click()
  await expect(beto.page.getByRole('dialog', { name: /desafiou você/ })).toBeVisible()
  await beto.page.getByRole('button', { name: 'Agora não' }).click()

  // Código inexistente: a mesma mensagem.
  await beto.page.goto('/x1')
  await beto.page.getByLabel('Código ou link do x1').fill('ZZZZ2222')
  await beto.page.getByRole('button', { name: 'Entrar' }).click()
  await expect(beto.page.getByText('Não encontramos um x1 aberto com esse código.')).toBeVisible()

  // SC-007: do calendário ao duelo ativo em no máximo 3 cliques.
  await ana.page.goto('/calendario')
  await ana.page.getByRole('link', { name: /^x1/ }).click()
  await ana.page.getByRole('link', { name: /O Globo, / }).click()
  await expect(ana.page.getByRole('button', { name: 'Começar a minha partida' })).toBeVisible()

  // Outro aparelho: o link de retorno devolve o duelo ao criador.
  const third = await person(browser)
  await third.page.goto(back)
  await expect(third.page.getByRole('button', { name: 'Começar a minha partida' })).toBeVisible()
  expect(third.page.url()).not.toContain('#p=')
  await third.context.close()
  await ana.context.close()
  await beto.context.close()
})

test('o contador do menu só aparece com x1 esperando e não move os outros links', async ({
  browser,
}) => {
  const ana = await person(browser)
  const beto = await person(browser)
  const { invite } = await createDuel(ana.page)
  await ana.page.goto('/calendario')
  const link = ana.page.getByRole('link', { name: /^x1/ })
  await expect(link).toBeVisible()
  const before = await link.boundingBox()
  const calendar = await ana.page.getByRole('link', { name: 'Calendário' }).boundingBox()

  await accept(beto.page, invite)
  // Agora há um x1 que pede atenção: o número aparece e só o link do x1 cresce, para a direita.
  await ana.page.reload()
  await expect(ana.page.getByRole('link', { name: 'x1, 1 aguardando' })).toBeVisible()
  const after = await ana.page.getByRole('link', { name: /^x1/ }).boundingBox()
  expect(after?.width ?? 0).toBeGreaterThan(before?.width ?? 0)
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(0.5)
  const calendarAfter = await ana.page.getByRole('link', { name: 'Calendário' }).boundingBox()
  expect(Math.abs((calendarAfter?.x ?? 0) - (calendar?.x ?? 0))).toBeLessThan(0.5)
  await ana.context.close()
  await beto.context.close()
})
