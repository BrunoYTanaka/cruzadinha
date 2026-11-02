import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { insertPuzzleIfAbsent } from '../modules/puzzles/puzzles.repository'
import { todayInSaoPaulo } from '../platform/lib/dates'
import { defaultRateLimits } from '../platform/rate-limit'
import { buildTestApp, signUpForTest } from './app'
import { MINUTE, openTestDatabase, testClock, truncateAll, type TestClock } from './database'
import { fakeSource, okResult } from './fake-source'

const handle = openTestDatabase()
const { db } = handle
const HOUR = 60 * MINUTE

let clock: TestClock
let app: FastifyInstance
let puzzleId: string

const rules = (patch: object = {}) => ({
  helpMode: 'free',
  helpPenaltyMs: null,
  maxMs: null,
  startDeadlineHours: 24,
  ...patch,
})

const post = (url: string, payload: object, sid?: string) =>
  app.inject({ method: 'POST', url, payload, headers: sid ? { cookie: `sid=${sid}` } : {} })

type Created = { linkToken: string; code: string; participantToken?: string }

async function create(
  nickname = 'Ana',
  options: { sid?: string; rules?: object } = {},
): Promise<Created> {
  const response = await post(
    '/api/duels',
    { puzzleId, rules: rules(options.rules), nickname },
    options.sid,
  )
  expect(response.statusCode).toBe(200)
  return response.json()
}

async function join(
  linkToken: string,
  nickname = 'Beto',
  sid?: string,
): Promise<{ participantToken?: string }> {
  const response = await post('/api/duels/start', { linkToken, nickname }, sid)
  expect(response.statusCode).toBe(200)
  return response.json()
}

const as = (linkToken: string, participantToken?: string, sid?: string) => ({
  body: { linkToken, ...(participantToken ? { participantToken } : {}) },
  sid,
})

const call = (path: string, who: ReturnType<typeof as>, extra: object = {}) =>
  post(`/api/duels/${path}`, { ...who.body, ...extra }, who.sid)

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  app = buildTestApp({
    database: db,
    clock: clock.now,
    puzzleSources: [fakeSource()],
    rateLimits: {
      ...defaultRateLimits,
      duelLookup: { max: 5000, windowMinutes: 60 },
      duelMine: { max: 5000, windowMinutes: 60 },
    },
  })
  const ok = okResult(todayInSaoPaulo(clock.now))
  puzzleId = (await insertPuzzleIfAbsent(db, { puzzle: ok.puzzle, solution: ok.solution })).puzzleId
})
afterEach(() => app.close())
afterAll(() => handle.close())

describe('criar', () => {
  it('visitante recebe link, código e token; o banco guarda só o hash do token', async () => {
    const created = await create()
    expect(created.code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/)
    expect(created.participantToken).toBeTruthy()
    const rows = await db.execute<{ token_hash: string; link_token: string }>(
      sql`SELECT p.token_hash, d.link_token FROM duel_participants p JOIN duels d USING (duel_id)`,
    )
    expect(rows[0]?.link_token).toBe(created.linkToken)
    expect(rows[0]?.token_hash).not.toBe(created.participantToken)
    expect(rows[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('exige apelido de todos e recusa cruzada desconhecida', async () => {
    expect((await post('/api/duels', { puzzleId, rules: rules() })).statusCode).toBe(400)
    const unknown = await post('/api/duels', {
      puzzleId: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      rules: rules(),
      nickname: 'Ana',
    })
    expect(unknown.statusCode).toBe(404)
  })

  it('conta não recebe token (usa a sessão) e tem teto de 5 abertos', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    const first = await create('Ana', { sid })
    expect(first.participantToken).toBeUndefined()
    for (let i = 0; i < 4; i += 1) await create('Ana', { sid })
    const sixth = await post('/api/duels', { puzzleId, rules: rules(), nickname: 'Ana' }, sid)
    expect(sixth.statusCode).toBe(409)
    expect(sixth.json().error).toBe('open-limit')
  })

  it('limita a criação por endereço', async () => {
    for (let i = 0; i < 10; i += 1) await create()
    const eleventh = await post('/api/duels', { puzzleId, rules: rules(), nickname: 'Ana' })
    expect(eleventh.statusCode).toBe(429)
    expect(eleventh.headers['retry-after']).toBeTruthy()
  })
})

describe('consultar por código ou link', () => {
  it('mostra as regras e não altera o duelo, nem depois de mil consultas', async () => {
    const created = await create()
    const before = await db.execute<{ updated_at: Date }>(sql`SELECT updated_at FROM duels`)
    for (let i = 0; i < 1000; i += 1) {
      const byCode = await post('/api/duels/lookup', { code: created.code })
      expect(byCode.statusCode).toBe(200)
    }
    const byLink = await post('/api/duels/lookup', { linkToken: created.linkToken })
    expect(byLink.json()).toMatchObject({ linkToken: created.linkToken, creatorNickname: 'Ana' })
    const after = await db.execute<{ updated_at: Date }>(sql`SELECT updated_at FROM duels`)
    expect(after[0]?.updated_at).toEqual(before[0]?.updated_at)
    const people = await db.execute(sql`SELECT 1 FROM duel_participants`)
    expect(people).toHaveLength(1)
  })

  it('responde igual para inexistente e para duelo que já foi aceito', async () => {
    const created = await create()
    await join(created.linkToken)
    const missing = await post('/api/duels/lookup', { code: 'ABCDEFGH' })
    const taken = await post('/api/duels/lookup', { code: created.code })
    expect(taken.statusCode).toBe(missing.statusCode)
    expect(taken.json()).toEqual(missing.json())
  })

  it('limita as consultas por endereço', async () => {
    app = buildTestApp({ database: db, clock: clock.now, puzzleSources: [fakeSource()] })
    for (let i = 0; i < 30; i += 1) await post('/api/duels/lookup', { code: 'ABCDEFGH' })
    expect((await post('/api/duels/lookup', { code: 'ABCDEFGH' })).statusCode).toBe(429)
  })
})

describe('começar', () => {
  it('dois "Começar" simultâneos ocupam uma vaga só', async () => {
    const created = await create()
    const [a, b] = await Promise.all([
      post('/api/duels/start', { linkToken: created.linkToken, nickname: 'Beto' }),
      post('/api/duels/start', { linkToken: created.linkToken, nickname: 'Caio' }),
    ])
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409])
    const loser = a.statusCode === 409 ? a : b
    expect(loser.json().error).toBe('duel-taken')
    const people = await db.execute(sql`SELECT 1 FROM duel_participants WHERE role = 'opponent'`)
    expect(people).toHaveLength(1)
  })

  it('o criador não ocupa a vaga do próprio duelo e começar de novo é idempotente', async () => {
    const created = await create()
    const me = as(created.linkToken, created.participantToken)
    const first = await call('start', me, { nickname: 'Ana' })
    expect(first.statusCode).toBe(200)
    clock.advance(MINUTE)
    const again = await call('start', me, { nickname: 'Ana' })
    expect(again.json().startedAt).toBe(first.json().startedAt)
    const people = await db.execute(sql`SELECT 1 FROM duel_participants`)
    expect(people).toHaveLength(1)
  })

  it('a mesma conta em dois aparelhos é o mesmo participante', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    const created = await create('Ana', { sid })
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@exemplo.com', password: 'senha-boa-123' },
    })
    const sid2 = /sid=([^;]+)/.exec(String(second.headers['set-cookie']))?.[1]
    const a = await call('start', as(created.linkToken, undefined, sid), { nickname: 'Ana' })
    const b = await call('start', as(created.linkToken, undefined, sid2), { nickname: 'Ana' })
    expect(b.json().startedAt).toBe(a.json().startedAt)
  })

  it('não começa depois do prazo', async () => {
    const created = await create()
    clock.advance(25 * HOUR)
    const late = await post('/api/duels/start', { linkToken: created.linkToken, nickname: 'Beto' })
    expect(late.statusCode).toBe(404)
  })
})

describe('jogar e resultado', () => {
  async function started(ruleSet: object = {}) {
    const created = await create('Ana', { rules: ruleSet })
    const ana = as(created.linkToken, created.participantToken)
    await call('start', ana, { nickname: 'Ana' })
    const joined = await join(created.linkToken)
    const beto = as(created.linkToken, joined.participantToken)
    return { ana, beto, created }
  }

  it('o tempo é o do servidor; quem termina primeiro não vê o do outro; menor tempo vence', async () => {
    const { ana, beto } = await started()
    clock.advance(10 * MINUTE)
    const first = await call('finish', beto, { helpsUsed: 0 })
    expect(first.json().duel).toMatchObject({
      status: 'running',
      myStatus: 'waiting-other',
      result: null,
    })
    expect(JSON.stringify(first.json())).not.toContain('600000')
    const mid = await call('state', ana)
    expect(mid.json().duel.opponentStatus).toBe('done')
    expect(mid.json().duel.result).toBeNull()
    clock.advance(2 * MINUTE)
    const last = await call('finish', ana, { helpsUsed: 0 })
    const result = last.json().duel.result
    expect(result).toMatchObject({ verdict: 'lost', reason: 'time', diffMs: 2 * MINUTE })
    expect(result.opponent.elapsedMs).toBe(10 * MINUTE)
    const betoView = (await call('state', beto)).json().duel
    expect(betoView.result.verdict).toBe('won')
  })

  it('soma a penalidade das ajudas e empata em tempos iguais', async () => {
    const { ana, beto } = await started({ helpMode: 'penalty', helpPenaltyMs: 30_000 })
    clock.advance(10 * MINUTE)
    await call('finish', ana, { helpsUsed: 2 })
    const done = await call('finish', beto, { helpsUsed: 2 })
    expect(done.json().duel.result).toMatchObject({ verdict: 'tie', reason: 'time', diffMs: 0 })
    expect(done.json().duel.result.me.penaltyMs).toBe(60_000)
  })

  it('terminar acima do tempo máximo é "tempo esgotado" e perde', async () => {
    const { ana, beto } = await started({ maxMs: 30 * MINUTE })
    clock.advance(31 * MINUTE)
    const late = await call('finish', ana, { helpsUsed: 0 })
    expect(late.json().duel.result).toMatchObject({ verdict: 'lost', reason: 'timeout' })
    expect((await call('state', beto)).json().duel.result.verdict).toBe('won')
  })

  it('a sessão vale mais que o token', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    const created = await create('Ana', { sid })
    const withBoth = as(created.linkToken, 'x'.repeat(43), sid)
    expect((await call('state', withBoth)).statusCode).toBe(200)
    expect((await call('state', as(created.linkToken))).statusCode).toBe(404)
  })

  it('quem não participa recebe 404 e o state devolve o puzzleId só a quem está jogando', async () => {
    const { ana, created } = await started()
    expect((await call('state', as(created.linkToken, 'y'.repeat(43)))).statusCode).toBe(404)
    expect((await call('state', ana)).json().puzzleId).toBe(puzzleId)
  })
})

describe('finais', () => {
  it('desistir vale na hora e o outro vence', async () => {
    const created = await create()
    const ana = as(created.linkToken, created.participantToken)
    const joined = await join(created.linkToken)
    const beto = as(created.linkToken, joined.participantToken)
    const out = await call('forfeit', beto)
    expect(out.json().duel.result).toMatchObject({ verdict: 'lost', reason: 'forfeit' })
    expect((await call('state', ana)).json().duel.result.verdict).toBe('won')
    expect((await call('forfeit', beto)).statusCode).toBe(409)
  })

  it('o criador cancela só enquanto aberto', async () => {
    const open = await create()
    const cancel = await call('cancel', as(open.linkToken, open.participantToken))
    expect(cancel.json().duel.status).toBe('cancelled')
    expect((await post('/api/duels/lookup', { code: open.code })).statusCode).toBe(404)

    const running = await create()
    await join(running.linkToken)
    const late = await call('cancel', as(running.linkToken, running.participantToken))
    expect(late.statusCode).toBe(409)
  })

  it('recusar encerra o duelo e o criador vê o motivo', async () => {
    const created = await create()
    const refused = await post('/api/duels/decline', { linkToken: created.linkToken })
    expect(refused.json()).toEqual({ declined: true })
    const view = (await call('state', as(created.linkToken, created.participantToken))).json().duel
    expect(view.result).toMatchObject({ verdict: 'won', reason: 'declined', opponent: null })
    expect((await post('/api/duels/lookup', { code: created.code })).statusCode).toBe(404)
  })

  it('prazo vencido sem oponente expira; com um só terminado, ele vence por W.O.', async () => {
    const lonely = await create()
    clock.advance(25 * HOUR)
    const lonelyView = await call('state', as(lonely.linkToken, lonely.participantToken))
    expect(lonelyView.json().duel.status).toBe('expired')

    clock.set(new Date())
    const created = await create()
    const ana = as(created.linkToken, created.participantToken)
    await call('start', ana, { nickname: 'Ana' })
    await join(created.linkToken)
    clock.advance(5 * MINUTE)
    await call('finish', ana, { helpsUsed: 0 })
    clock.advance(7 * HOUR)
    const view = (await call('state', ana)).json().duel
    expect(view.status).toBe('running')
    clock.advance(24 * HOUR)
    const wo = (await call('state', ana)).json().duel
    expect(wo.result).toMatchObject({ verdict: 'won', reason: 'walkover' })
    const stored = await db.execute<{ state: string }>(
      sql`SELECT state FROM duels WHERE link_token = ${created.linkToken}`,
    )
    expect(stored[0]?.state).toBe('finished')
  })

  it('apagar a conta preserva o duelo e o apelido', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    await create('Ana', { sid })
    await db.execute(sql`DELETE FROM users`)
    const rows = await db.execute<{ nickname: string; user_id: string | null }>(
      sql`SELECT nickname, user_id FROM duel_participants`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ nickname: 'Ana', user_id: null })
  })
})

describe('Meus x1', () => {
  it('conta lista os seus duelos; visitante, só os dos tokens', async () => {
    const sid = await signUpForTest(app, db, 'ana@exemplo.com', 'senha-boa-123')
    await create('Ana', { sid })
    const guest = await create('Gil')
    const account = await post('/api/duels/mine', {}, sid)
    expect(account.json().duels).toHaveLength(1)
    const visitor = await post('/api/duels/mine', { participantTokens: [guest.participantToken] })
    expect(visitor.json().duels).toHaveLength(1)
    expect(visitor.json().duels[0].linkToken).toBe(guest.linkToken)
    // a sessão vence os tokens
    const both = await post('/api/duels/mine', { participantTokens: [guest.participantToken] }, sid)
    expect(both.json().duels).toHaveLength(1)
    expect(both.json().duels[0].linkToken).not.toBe(guest.linkToken)
  })

  it('recusa 21 tokens e esconde o finalizado depois de 24 horas', async () => {
    const tokens = Array.from({ length: 21 }, () => 'z'.repeat(43))
    expect((await post('/api/duels/mine', { participantTokens: tokens })).statusCode).toBe(400)

    const created = await create()
    const ana = as(created.linkToken, created.participantToken)
    const joined = await join(created.linkToken)
    await call('forfeit', as(created.linkToken, joined.participantToken))
    const list = () => post('/api/duels/mine', { participantTokens: [created.participantToken] })
    const fresh = (await list()).json().duels
    expect(fresh).toHaveLength(1)
    expect(fresh[0]).toMatchObject({ status: 'finished', attention: true })
    clock.advance(25 * HOUR)
    expect((await list()).json().duels).toHaveLength(0)
    void ana
  })
})
