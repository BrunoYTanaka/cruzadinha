import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import postgres from 'postgres'

const repoRoot = join(import.meta.dirname, '..', '..', '..')
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres'])

export const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? 'dev@cruzadinha.local'
export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'senha-de-teste-123'

// Os testes apagam tabelas: só rodam contra um banco local e nunca em produção.
function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida para o E2E')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O E2E se recusa a rodar com NODE_ENV=production')
  }
  const host = new URL(url).hostname
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`O E2E se recusa a apagar dados em um banco não local (${host})`)
  }
  return url
}

function runApi(script: string[], input?: string): string {
  return execFileSync('npm', ['run', ...script], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
    encoding: 'utf8',
    input,
  })
}

// Esvazia as tabelas de dados (nunca `drizzle`, que guarda as migrações).
export async function resetDatabase(): Promise<void> {
  const sql = postgres(databaseUrl(), { max: 1, onnotice: () => undefined })
  try {
    await sql.unsafe(
      'TRUNCATE TABLE progress, sessions, rate_limit_attempts, puzzles, pending_registrations, email_send_block, users CASCADE',
    )
  } finally {
    await sql.end()
  }
}

// Conta de teste e cruzada de amostra de hoje, sem tocar na rede.
export function seedDatabase(): void {
  databaseUrl()
  runApi(['db:seed', '-w', '@cruzadinha/api'])
}

// Cria uma conta pela CLI do autor (feature 013); a senha vai pela entrada padrão, nunca como argumento.
export function createAccount(email: string, password: string): void {
  databaseUrl()
  runApi(
    ['cli', '-w', '@cruzadinha/api', '--', 'users', 'create', '--email', email],
    `${password}\n`,
  )
}

// Linhas de progresso guardadas no servidor (o visitante não grava nenhuma).
export async function progressRowCount(): Promise<number> {
  const sql = postgres(databaseUrl(), { max: 1, onnotice: () => undefined })
  try {
    const [row] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM progress`
    return Number(row?.count ?? 0)
  } finally {
    await sql.end()
  }
}

export function brasiliaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export async function resetAndSeed(): Promise<void> {
  await resetDatabase()
  seedDatabase()
}

export async function login(page: Page, email = SEED_EMAIL, password = SEED_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { level: 1, name: 'Hoje' }).waitFor()
}

type Solution = { cells: (string | null)[][] }

// A fonte traz letras com acento (Ã); o jogador digita a letra simples (o Ç fica como está).
export function typedLetter(letter: string): string {
  return letter === 'Ç' ? letter : letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

type Word = { direction: 'across' | 'down'; row: number; col: number; length: number }
type TodayPuzzle = { puzzle: { words: Word[] }; solution: Solution }

// Puzzle e solução vêm da própria API (o front recebe os dois juntos): o teste não escreve o layout
// nem as letras à mão. Usa o cookie do contexto, ou nenhum para o visitante.
export async function todayPuzzle(request: APIRequestContext): Promise<TodayPuzzle> {
  const response = await request.get(`/api/puzzles?level=daily&date=${brasiliaToday()}`)
  return (await response.json()) as TodayPuzzle
}

export async function todaySolution(request: APIRequestContext): Promise<Solution['cells']> {
  return (await todayPuzzle(request)).solution.cells
}

// Digita uma letra no tabuleiro. O teclado do Playwright é o americano e não tem a tecla Ç: ela
// chega ao tabuleiro como o evento de tecla de um teclado brasileiro.
export async function pressLetter(page: Page, letter: string): Promise<void> {
  if (letter !== 'Ç') return page.keyboard.press(letter)
  await page.getByRole('grid').dispatchEvent('keydown', { key: 'Ç', bubbles: true })
}

// Clica em cada célula aberta e digita a letra da solução (pula as que já estão certas).
export async function fillSolution(page: Page, cells: (string | null)[][]): Promise<void> {
  for (const [row, line] of cells.entries()) {
    for (const [col, letter] of line.entries()) {
      if (!letter) continue
      await page
        .getByRole('gridcell', { name: new RegExp(`^Linha ${row + 1}, coluna ${col + 1},`) })
        .click()
      await pressLetter(page, typedLetter(letter))
    }
  }
}

// Digita uma letra por célula da palavra, clicando em cada uma antes: a direção selecionada no
// tabuleiro não importa.
export async function typeWord(page: Page, word: Word, letters: string[]): Promise<void> {
  for (const [offset, letter] of letters.entries()) {
    const row = word.row + (word.direction === 'down' ? offset : 0)
    const col = word.col + (word.direction === 'across' ? offset : 0)
    await page
      .getByRole('gridcell', { name: new RegExp(`^Linha ${row + 1}, coluna ${col + 1},`) })
      .click()
    await pressLetter(page, letter)
  }
}

// Letras da solução numa palavra, já como o jogador as digita (sem acento).
export function solutionLetters(solution: Solution, word: Word): string[] {
  return Array.from({ length: word.length }, (_, offset) => {
    const row = word.row + (word.direction === 'down' ? offset : 0)
    const col = word.col + (word.direction === 'across' ? offset : 0)
    return typedLetter(solution.cells[row]?.[col] ?? '')
  })
}

// Acerta a primeira palavra horizontal da cruzada aberta (feature 016: a dica dela fica riscada).
export async function solveFirstAcrossWord(page: Page): Promise<TodayPuzzle> {
  const today = await todayPuzzle(page.request)
  const word = today.puzzle.words.find((item) => item.direction === 'across')
  if (!word) throw new Error('a cruzada de hoje deveria ter uma palavra horizontal')
  await typeWord(page, word, solutionLetters(today.solution, word))
  return today
}

// Medidas usadas pelos testes de layout (features 017 a 019 e 023).
export async function box(locator: Locator) {
  const value = await locator.boundingBox()
  if (!value) throw new Error(`o elemento ${String(locator)} não está na tela`)
  return value
}

// Diferença de no máximo 1 px: a centralização pode cair em meio pixel.
export function expectNear(received: number, expected: number) {
  expect(Math.abs(received - expected)).toBeLessThanOrEqual(1)
}

// Valor computado de uma propriedade num elemento de prova com `value` (um token do tema), para
// comparar com o do elemento real sem escrever a cor do tema no teste.
export function probe(
  page: Page,
  property: 'background-color' | 'stroke' | 'color',
  value: string,
) {
  return page.evaluate(
    ([name, token]) => {
      const element = document.createElement('div')
      element.style.setProperty(name, token)
      document.body.append(element)
      const computed = getComputedStyle(element).getPropertyValue(name)
      element.remove()
      return computed
    },
    [property, value] as const,
  )
}

export function css(locator: Locator, property: string) {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  )
}
