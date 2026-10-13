import { describe, expect, it } from 'vitest'
import { loadConfig, loadSeedConfig } from './config'

const databaseUrl = 'postgres://user:pass@localhost:5432/db'
const secretMarker = 'postgres://usuario:SEGREDO@host/db'

function errorMessage(env: Record<string, string | undefined>): string {
  try {
    loadConfig(env)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('loadConfig did not fail')
}

describe('loadConfig', () => {
  it('applies the defaults when only DATABASE_URL is set', () => {
    expect(loadConfig({ DATABASE_URL: databaseUrl })).toEqual({
      nodeEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      databaseUrl,
      trustProxyHops: 0,
    })
  })

  it('reads every variable', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://user:pass@db:5432/app',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '8080',
      LOG_LEVEL: 'debug',
      TRUST_PROXY_HOPS: '2',
    })
    expect(config).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'debug',
      databaseUrl: 'postgresql://user:pass@db:5432/app',
      trustProxyHops: 2,
    })
  })

  it('returns a frozen object', () => {
    expect(Object.isFrozen(loadConfig({ DATABASE_URL: databaseUrl }))).toBe(true)
  })

  it('fails without DATABASE_URL', () => {
    expect(errorMessage({})).toContain('DATABASE_URL')
  })

  it('fails when DATABASE_URL is not a postgres URL', () => {
    expect(errorMessage({ DATABASE_URL: 'http://localhost:5432/db' })).toContain('DATABASE_URL')
  })

  it.each(['0', '70000', 'abc', '3.5'])('fails when PORT is %s', (port) => {
    expect(errorMessage({ DATABASE_URL: databaseUrl, PORT: port })).toContain('PORT')
  })

  it.each(['-1', 'abc', '1.5', '11'])('fails when TRUST_PROXY_HOPS is %s', (hops) => {
    expect(errorMessage({ DATABASE_URL: databaseUrl, TRUST_PROXY_HOPS: hops })).toContain(
      'TRUST_PROXY_HOPS',
    )
  })

  it('fails on unknown NODE_ENV and LOG_LEVEL', () => {
    const message = errorMessage({ DATABASE_URL: databaseUrl, NODE_ENV: 'prod', LOG_LEVEL: 'loud' })
    expect(message).toContain('NODE_ENV')
    expect(message).toContain('LOG_LEVEL')
  })

  it('never includes the received values in the message', () => {
    const message = errorMessage({ DATABASE_URL: databaseUrl, PORT: secretMarker })
    expect(message).toContain('PORT')
    expect(message).not.toContain('SEGREDO')
    expect(errorMessage({ DATABASE_URL: 'mysql://usuario:SEGREDO@host/db' })).not.toContain(
      'SEGREDO',
    )
  })
})

describe('loadSeedConfig', () => {
  const seedEnv = {
    SEED_USER_EMAIL: ' Dev@Cruzadinha.local ',
    SEED_USER_PASSWORD: 'senha-de-teste-123',
  }

  it('normalizes the e-mail and keeps the password', () => {
    expect(loadSeedConfig(seedEnv)).toEqual({
      nodeEnv: 'development',
      email: 'dev@cruzadinha.local',
      password: 'senha-de-teste-123',
    })
  })

  it('names each missing or invalid variable without its value', () => {
    let message = ''
    try {
      loadSeedConfig({ SEED_USER_EMAIL: 'SEGREDO', SEED_USER_PASSWORD: '1234567' })
    } catch (error) {
      message = error instanceof Error ? error.message : ''
    }
    expect(message).toContain('SEED_USER_EMAIL: deve ser um e-mail válido')
    expect(message).toContain('SEED_USER_PASSWORD: deve ter de 8 a 128 caracteres')
    expect(message).not.toContain('SEGREDO')
    expect(() => loadSeedConfig({})).toThrow('SEED_USER_EMAIL: obrigatória')
  })
})
