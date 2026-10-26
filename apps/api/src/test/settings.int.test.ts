import { defaultSettings } from '@cruzadinha/shared'
import { eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { userSettings, users } from '../platform/db/schema'
import { defaultRateLimits, type RateLimits } from '../platform/rate-limit/limits'
import { buildTestApp, signUpForTest } from './app'
import { openTestDatabase, testClock, truncateAll, type TestClock } from './database'

const handle = openTestDatabase()
const { db } = handle

const PASSWORD = 'senha-boa-123'
const settings = { ...defaultSettings({ letters: 4, words: 2 }), theme: 'dark' as const }

let clock: TestClock
let app: FastifyInstance

function build(rateLimits: RateLimits = defaultRateLimits) {
  app = buildTestApp({ database: db, clock: clock.now, rateLimits })
}

const register = (email: string) => signUpForTest(app, db, email, PASSWORD)

const asUser = (sid?: string) => (sid ? { cookie: `sid=${sid}` } : {})

const at = (seconds: number) => new Date(clock.now().getTime() + seconds * 1000).toISOString()

function getSettings(sid?: string) {
  return app.inject({ method: 'GET', url: '/api/settings', headers: asUser(sid) })
}

function putSettings(payload: unknown, sid?: string) {
  return app.inject({
    method: 'PUT',
    url: '/api/settings',
    headers: asUser(sid),
    payload: payload as object,
  })
}

beforeEach(async () => {
  await truncateAll(db)
  clock = testClock()
  build()
})

afterAll(() => handle.close())

describe('GET/PUT /api/settings', () => {
  it('sem sessão responde 401', async () => {
    expect((await getSettings()).statusCode).toBe(401)
    expect((await putSettings({ settings, savedAt: at(-1) })).statusCode).toBe(401)
  })

  it('conta que nunca salvou devolve null', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await getSettings(sid)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ settings: null, savedAt: null })
  })

  it('PUT grava e o GET devolve o mesmo', async () => {
    const sid = await register('ana@exemplo.com')
    const savedAt = at(-10)
    const put = await putSettings({ settings, savedAt }, sid)
    expect(put.statusCode).toBe(200)
    expect(put.json()).toEqual({ settings, savedAt })
    expect((await getSettings(sid)).json()).toEqual({ settings, savedAt })
  })

  it('campo inválido responde 400 com o nome do campo, nunca o valor', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putSettings(
      { settings: { ...settings, helpLetters: 500 }, savedAt: at(-1) },
      sid,
    )
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['settings'] })
    expect(response.body).not.toContain('500')
  })

  it('savedAt mais de 5 minutos no futuro responde 400', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putSettings({ settings, savedAt: at(600) }, sid)
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input', fields: ['savedAt'] })
  })

  it('corpo acima de 4096 bytes responde 400', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putSettings(
      { settings: { ...settings, padding: 'x'.repeat(5000) }, savedAt: at(-1) },
      sid,
    )
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid-input' })
  })

  it('chave desconhecida é descartada e fonte desconhecida é aceita (FR-012b)', async () => {
    const sid = await register('ana@exemplo.com')
    const response = await putSettings(
      { settings: { ...settings, defaultSource: 'nova-fonte', newOption: true }, savedAt: at(-1) },
      sid,
    )
    expect(response.statusCode).toBe(200)
    expect(response.json().settings).toEqual({ ...settings, defaultSource: 'nova-fonte' })
  })

  it('pedido sem copyClue, de um site anterior, é aceito (feature 033)', async () => {
    const sid = await register('ana@exemplo.com')
    const older = Object.fromEntries(Object.entries(settings).filter(([key]) => key !== 'copyClue'))
    const response = await putSettings({ settings: older, savedAt: at(-1) }, sid)
    expect(response.statusCode).toBe(200)
    expect(response.json().settings).toEqual(older)
  })

  it('savedAt mais antigo não sobrescreve e devolve o que vale (FR-022)', async () => {
    const sid = await register('ana@exemplo.com')
    const newer = at(-10)
    await putSettings({ settings, savedAt: newer }, sid)
    const response = await putSettings(
      { settings: { ...settings, theme: 'light' }, savedAt: at(-60) },
      sid,
    )
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ settings, savedAt: newer })
  })

  it('dois pedidos em paralelo fora de ordem: vale o mais novo', async () => {
    const sid = await register('ana@exemplo.com')
    await Promise.all([
      putSettings({ settings: { ...settings, theme: 'light' }, savedAt: at(-5) }, sid),
      putSettings({ settings: { ...settings, theme: 'auto' }, savedAt: at(-50) }, sid),
    ])
    expect((await getSettings(sid)).json().settings.theme).toBe('light')
  })

  it('campo guardado que não vale mais volta omitido, sem padrão', async () => {
    const sid = await register('ana@exemplo.com')
    await putSettings({ settings, savedAt: at(-10) }, sid)
    await db.execute(
      sql`UPDATE user_settings SET settings = jsonb_set(settings, '{theme}', '"roxo"')`,
    )
    const body = (await getSettings(sid)).json()
    expect(body.settings).not.toHaveProperty('theme')
    expect(body.settings.helpLetters).toBe(4)
  })

  it('cada usuário só lê as próprias configurações', async () => {
    const ana = await register('ana@exemplo.com')
    const bia = await register('bia@exemplo.com')
    await putSettings({ settings, savedAt: at(-10) }, ana)
    expect((await getSettings(bia)).json()).toEqual({ settings: null, savedAt: null })
  })

  it('excluir o usuário apaga as configurações (FR-026)', async () => {
    const sid = await register('ana@exemplo.com')
    await putSettings({ settings, savedAt: at(-10) }, sid)
    await db.delete(users).where(eq(users.email, 'ana@exemplo.com'))
    expect(await db.select().from(userSettings)).toEqual([])
  })

  it('o gatilho atualiza updated_at ao mudar a linha', async () => {
    const sid = await register('ana@exemplo.com')
    await putSettings({ settings, savedAt: at(-20) }, sid)
    const [before] = await db.select().from(userSettings)
    await new Promise((resolve) => setTimeout(resolve, 20))
    await putSettings({ settings: { ...settings, theme: 'light' }, savedAt: at(-10) }, sid)
    const [after] = await db.select().from(userSettings)
    expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime())
  })

  it('acima do limite por endereço responde 429 com retry-after', async () => {
    build({ ...defaultRateLimits, settingsSave: { max: 2, windowMinutes: 60 } })
    const sid = await register('ana@exemplo.com')
    expect((await putSettings({ settings, savedAt: at(-3) }, sid)).statusCode).toBe(200)
    expect((await putSettings({ settings, savedAt: at(-2) }, sid)).statusCode).toBe(200)
    const blocked = await putSettings({ settings, savedAt: at(-1) }, sid)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toMatchObject({ error: 'too-many-attempts' })
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })
})
