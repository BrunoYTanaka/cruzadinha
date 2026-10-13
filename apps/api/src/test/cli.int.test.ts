import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { invites, users } from '../db/schema'
import { runCli } from '../cli/run-cli'
import { buildTestApp } from './app'
import { fakeSource, okResult, type FakeSource } from './fake-source'
import type { FetchPuzzleResult } from '../sources/types'
import { addDaysToIsoDate, todayInSaoPaulo } from '../lib/dates'
import { DAY, openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

let clock: TestClock
let out: string
let err: string

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  out = ''
  err = ''
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
    stdout: (text) => {
      out += text
    },
    stderr: (text) => {
      err += text
    },
  })
}

function printedCode(): string {
  const match = /Convite criado: ([A-Z2-9]{4}(?:-[A-Z2-9]{4}){3})/.exec(out)
  if (!match?.[1]) throw new Error(`código não encontrado na saída: ${out}`)
  return match[1]
}

describe('invites create', () => {
  it('creates an invite valid for 7 days by default and shows the code once', async () => {
    expect(await cli('invites', 'create')).toBe(0)
    printedCode()
    expect(out).toContain('Guarde o código: ele não será exibido de novo.')

    const [row] = await db.select().from(invites)
    expect(row?.expiresAt.getTime()).toBe(clock.now().getTime() + 7 * DAY)
    expect(row?.createdByUserId).toBeNull()
  })

  it('accepts --days', async () => {
    expect(await cli('invites', 'create', '--days', '1')).toBe(0)
    const [row] = await db.select().from(invites)
    expect(row?.expiresAt.getTime()).toBe(clock.now().getTime() + DAY)
  })

  it.each(['0', '-2', '1.5', 'abc'])('refuses --days %s without writing', async (days) => {
    expect(await cli('invites', 'create', `--days=${days}`)).toBe(2)
    expect(err).toContain('--days')
    expect(await db.select().from(invites)).toHaveLength(0)
  })

  it('has no quota', async () => {
    for (let i = 0; i < 4; i++) expect(await cli('invites', 'create')).toBe(0)
    const rows = await db.select().from(invites)
    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.createdByUserId === null)).toBe(true)
  })

  it('prints a code that registers an account', async () => {
    await cli('invites', 'create')
    const app = buildTestApp({ database: db, clock: clock.now })
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ana@x.com', password: 'senha-boa-123', inviteCode: printedCode() },
    })
    await app.close()
    expect(response.statusCode).toBe(201)
  })
})

async function registerWith(code: string, email: string) {
  const app = buildTestApp({ database: db, clock: clock.now })
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'senha-boa-123', inviteCode: code },
  })
  await app.close()
  return response
}

async function createdId(): Promise<{ inviteId: string; code: string }> {
  out = ''
  await cli('invites', 'create')
  const code = printedCode()
  const rows = await db.select().from(invites)
  const known = new Set(ids)
  const row = rows.find((candidate) => !known.has(candidate.inviteId))
  if (!row) throw new Error('convite novo não encontrado')
  ids.push(row.inviteId)
  return { inviteId: row.inviteId, code }
}

let ids: string[] = []
beforeEach(() => {
  ids = []
})

describe('invites list', () => {
  it('says when there is nothing to list', async () => {
    expect(await cli('invites', 'list')).toBe(0)
    expect(out).toBe('Nenhum convite.\n')
  })

  it('lists every invite with creator, dates and status, without codes', async () => {
    const fromCli = await createdId()
    const forAna = await createdId()
    const registered = await registerWith(forAna.code, 'ana@exemplo.com')
    const cookie = /sid=([^;]*)/.exec(String(registered.headers['set-cookie']))?.[1]

    const app = buildTestApp({ database: db, clock: clock.now })
    const created = await app.inject({
      method: 'POST',
      url: '/api/invites',
      headers: { cookie: `sid=${cookie}` },
    })
    await app.close()
    const userCode: string = created.json().code

    out = ''
    expect(await cli('invites', 'list')).toBe(0)
    const lines = out.trim().split('\n')
    expect(lines[0]).toMatch(/^ID\s+CRIADOR\s+CRIADO EM\s+EXPIRA EM\s+SITUAÇÃO$/)
    expect(lines).toHaveLength(4)
    expect(out).toContain('ana@exemplo.com')
    expect(out).toMatch(new RegExp(`${fromCli.inviteId}\\s+linha de comando .* ativo`))
    expect(out).toMatch(new RegExp(`${forAna.inviteId}\\s+linha de comando .* usado`))
    expect(out).toMatch(/ana@exemplo\.com .* ativo/)
    for (const code of [fromCli.code, forAna.code, userCode]) {
      expect(out).not.toContain(code)
      expect(out).not.toContain(code.replaceAll('-', ''))
    }
  })
})

describe('invites revoke', () => {
  it('revokes an active invite, which then is invalid and frees the quota', async () => {
    const invite = await createdId()
    out = ''
    expect(await cli('invites', 'revoke', invite.inviteId)).toBe(0)
    expect(out).toBe(`Convite ${invite.inviteId} revogado.\n`)

    const response = await registerWith(invite.code, 'ana@exemplo.com')
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid-invite')
  })

  it('frees a slot in the creator quota', async () => {
    const seed = await createdId()
    const registered = await registerWith(seed.code, 'ana@exemplo.com')
    const cookie = /sid=([^;]*)/.exec(String(registered.headers['set-cookie']))?.[1]
    const app = buildTestApp({ database: db, clock: clock.now })
    const create = () =>
      app.inject({ method: 'POST', url: '/api/invites', headers: { cookie: `sid=${cookie}` } })
    for (let i = 0; i < 3; i++) await create()
    expect((await create()).statusCode).toBe(409)

    const [user] = await db.select().from(users).where(eq(users.email, 'ana@exemplo.com'))
    const [mine] = await db
      .select()
      .from(invites)
      .where(eq(invites.createdByUserId, user?.userId ?? ''))
    expect(await cli('invites', 'revoke', mine?.inviteId ?? '')).toBe(0)
    expect((await create()).statusCode).toBe(201)
    await app.close()
  })

  it('revokes an expired invite', async () => {
    const invite = await createdId()
    clock.advance(8 * DAY)
    expect(await cli('invites', 'revoke', invite.inviteId)).toBe(0)
    out = ''
    await cli('invites', 'list')
    expect(out).toContain('revogado')
  })

  it('changes nothing for used, already revoked or unknown invites', async () => {
    const used = await createdId()
    await registerWith(used.code, 'ana@exemplo.com')
    const revoked = await createdId()
    await cli('invites', 'revoke', revoked.inviteId)
    const before = await db.select().from(invites)

    for (const inviteId of [
      used.inviteId,
      revoked.inviteId,
      '0b6f0c1e-4b7a-4e1f-9a62-1f6c7d2c9e10',
    ]) {
      err = ''
      expect(await cli('invites', 'revoke', inviteId)).toBe(1)
      expect(err).toBe('Nada a revogar: o convite não existe, já foi usado ou já foi revogado.\n')
    }
    const after = await db.select().from(invites)
    expect(after.map((row) => row.updatedAt.getTime()).sort()).toEqual(
      before.map((row) => row.updatedAt.getTime()).sort(),
    )
  })

  it('rejects an id that is not a UUID', async () => {
    expect(await cli('invites', 'revoke', 'abc')).toBe(2)
  })
})

describe('usage errors', () => {
  it('rejects an unknown command with exit code 2', async () => {
    expect(await cli('invites', 'explode')).toBe(2)
    expect(err).toContain('Uso:')
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
