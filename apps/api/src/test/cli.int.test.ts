import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { users } from '../db/schema'
import { runCli } from '../cli/run-cli'
import { buildTestApp } from './app'
import { fakeSource, okResult, type FakeSource } from './fake-source'
import type { FetchPuzzleResult } from '../sources/types'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let out: string
let err: string
// Respostas dadas a cada pedido de segredo (senha e confirmação), na ordem.
let secrets: string[]
let prompts: string[]

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  out = ''
  err = ''
  secrets = []
  prompts = []
  source = fakeSource()
})
afterAll(() => handle.close())

let source: FakeSource

function cli(...argv: string[]): Promise<number> {
  return runCli(argv, {
    db,
    clock: clock.now,
    source,
    historyDays: 0,
    readSecret: async (prompt) => {
      prompts.push(prompt)
      return secrets.shift() ?? ''
    },
    stdout: (text) => {
      out += text
    },
    stderr: (text) => {
      err += text
    },
  })
}

const PASSWORD = 'senha-do-amigo-1'

describe('users create (feature 013)', () => {
  it('cria a conta com o e-mail normalizado, pedindo a senha duas vezes', async () => {
    secrets = [PASSWORD, PASSWORD]
    expect(await cli('users', 'create', '--email', ' Amigo@Exemplo.com ')).toBe(0)

    expect(out).toBe('Conta criada: amigo@exemplo.com\n')
    expect(prompts).toEqual(['Senha: ', 'Confirme a senha: '])
    const [row] = await db.select().from(users)
    expect(row?.email).toBe('amigo@exemplo.com')
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true)
  })

  it('cria a conta mesmo com o cadastro fechado, e ela entra pelo site', async () => {
    secrets = [PASSWORD, PASSWORD]
    expect(await cli('users', 'create', '--email', 'amigo@exemplo.com')).toBe(0)

    const app = buildTestApp({
      database: db,
      clock: clock.now,
      env: { REGISTRATION_ENABLED: 'false' },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'amigo@exemplo.com', password: PASSWORD },
    })
    await app.close()
    expect(login.statusCode).toBe(200)
  })

  it('não altera uma conta que já existe', async () => {
    secrets = [PASSWORD, PASSWORD]
    await cli('users', 'create', '--email', 'amigo@exemplo.com')
    const [before] = await db.select().from(users)
    out = ''
    secrets = ['outra-senha-123', 'outra-senha-123']

    expect(await cli('users', 'create', '--email', 'AMIGO@exemplo.com')).toBe(1)
    expect(err).toBe('Já existe uma conta com esse e-mail.\n')
    expect(out).toBe('')
    const [after] = await db.select().from(users)
    expect(after?.passwordHash).toBe(before?.passwordHash)
  })

  it.each([
    ['senha curta', ['1234567', '1234567'], 'A senha deve ter de 8 a 128 caracteres.'],
    ['confirmação diferente', [PASSWORD, 'outra-senha-123'], 'As senhas não conferem.'],
  ])('recusa %s com código 2, sem gravar', async (_case, given, message) => {
    secrets = [...given]
    expect(await cli('users', 'create', '--email', 'amigo@exemplo.com')).toBe(2)
    expect(err).toContain(message)
    expect(err).toContain('Uso:')
    expect(await db.select().from(users)).toHaveLength(0)
  })

  it.each([
    [['users', 'create'], 'Informe --email.'],
    [['users', 'create', '--email', 'nao-e-email'], 'E-mail inválido.'],
    [['users', 'create', '--email', 'amigo@exemplo.com', '--password', 'x'], 'Argumento inválido.'],
    [['users', 'create', 'amigo@exemplo.com'], 'Argumento inválido.'],
  ])('recusa %j com código 2, sem pedir a senha', async (argv, message) => {
    expect(await cli(...argv)).toBe(2)
    expect(err).toContain(message)
    expect(prompts).toEqual([])
    expect(await db.select().from(users)).toHaveLength(0)
  })

  it('nunca escreve a senha na saída nem nos erros', async () => {
    secrets = [PASSWORD, PASSWORD]
    await cli('users', 'create', '--email', 'amigo@exemplo.com')
    secrets = [PASSWORD, 'diferente-123']
    await cli('users', 'create', '--email', 'outro@exemplo.com')
    secrets = [PASSWORD, PASSWORD]
    await cli('users', 'create', '--email', 'amigo@exemplo.com')
    expect(out + err).not.toContain(PASSWORD)
  })
})

describe('usage errors', () => {
  it('rejects an unknown command with exit code 2', async () => {
    expect(await cli('users', 'explode')).toBe(2)
    expect(err).toContain('Uso:')
  })

  it.each([
    ['invites', 'create'],
    ['invites', 'list'],
    ['invites', 'revoke', 'x'],
  ])('os comandos de convite deixaram de existir: %s', async (...argv) => {
    expect(await cli(...argv)).toBe(2)
    expect(err).toContain('Comando desconhecido.')
  })
})

describe('puzzles collect', () => {
  const today = () => todayInSaoPaulo(clock.now)
  const withSource = (responses: Map<string, FetchPuzzleResult>) => {
    source = fakeSource(responses)
  }

  it('grava o puzzle de hoje e resume o resultado', async () => {
    withSource(new Map([[today(), okResult(today())]]))

    expect(await cli('puzzles', 'collect')).toBe(0)
    expect(out).toContain(
      'Coleta de puzzles: 1 gravados, 0 já existentes, 0 indisponíveis, 0 falhas.',
    )
    expect(out).toContain(`Gravados: ${today()}`)
    expect(err).toBe('')
  })

  it('é idempotente: a segunda execução sai com 0 e não consulta a fonte', async () => {
    withSource(new Map([[today(), okResult(today())]]))
    await cli('puzzles', 'collect')
    source.calls.length = 0
    out = ''

    expect(await cli('puzzles', 'collect')).toBe(0)
    expect(out).toContain('0 gravados, 1 já existentes')
    expect(source.calls).toEqual([])
  })

  it('sai com 1 e escreve a falha no stderr quando a fonte cai', async () => {
    withSource(new Map([[today(), { ok: false, reason: 'source-down', detail: 'corpo-bruto' }]]))

    expect(await cli('puzzles', 'collect')).toBe(1)
    expect(err).toContain(`Falhou em ${today()}: source-down`)
    expect(out + err).not.toContain('corpo-bruto')
  })

  it('sai com 1 e lista as datas pendentes quando a fonte limita o uso', async () => {
    const yesterday = addDaysToIsoDate(today(), -1)
    withSource(
      new Map<string, FetchPuzzleResult>([
        [today(), okResult(today())],
        [yesterday, { ok: false, reason: 'rate-limited' }],
      ]),
    )

    const code = await runCli(['puzzles', 'collect'], {
      db,
      clock: clock.now,
      source,
      historyDays: 1,
      readSecret: async () => '',
      stdout: (text) => {
        out += text
      },
      stderr: (text) => {
        err += text
      },
    })

    expect(code).toBe(1)
    expect(err).toContain(`Interrompido por limite de uso da fonte; pendentes: ${yesterday}`)
  })

  it('recusa argumento inesperado com o uso', async () => {
    expect(await cli('puzzles', 'collect', 'foo')).toBe(2)
    expect(err).toContain('Uso:')
    expect(source.calls).toEqual([])
  })

  it('não imprime a URL do banco', async () => {
    withSource(new Map([[today(), okResult(today())]]))
    await cli('puzzles', 'collect')
    expect(out + err).not.toMatch(/postgres(ql)?:\/\//)
  })
})
