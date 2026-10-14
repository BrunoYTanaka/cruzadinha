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

function runApi(script: string[]): string {
  return execFileSync('npm', ['run', ...script], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
    encoding: 'utf8',
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

// Cria um convite pela CLI do autor e devolve o código.
export function createInviteCode(): string {
  databaseUrl()
  const output = runApi(['cli', '-w', '@cruzadinha/api', '--', 'invites', 'create'])
  const code = /Convite criado:\s*([A-Z2-9]{4}(?:-[A-Z2-9]{4}){3})/.exec(output)?.[1]
  if (!code) throw new Error('Não foi possível ler o código do convite')
  return code
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
  await page.getByRole('heading', { name: 'Escolha um dia' }).waitFor()
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

// Clica em cada célula aberta e digita a letra da solução (pula as que já estão certas).
export async function fillSolution(page: Page, cells: (string | null)[][]): Promise<void> {
  for (const [row, line] of cells.entries()) {
    for (const [col, letter] of line.entries()) {
      if (!letter) continue
      await page
        .getByRole('gridcell', { name: new RegExp(`^Linha ${row + 1}, coluna ${col + 1},`) })
        .click()
      await page.keyboard.press(typedLetter(letter))
    }
  }
}
