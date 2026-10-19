import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import type { APIRequestContext, Page } from '@playwright/test'
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
      'TRUNCATE TABLE progress, sessions, invites, rate_limit_attempts, puzzles, users CASCADE',
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

// A solução vem da própria API (o front a recebe junto da cruzada): o teste não a escreve à mão.
export async function todaySolution(request: APIRequestContext): Promise<Solution['cells']> {
  const response = await request.get(`/api/puzzles?level=daily&date=${brasiliaToday()}`)
  const body = (await response.json()) as { solution: Solution }
  return body.solution.cells
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
