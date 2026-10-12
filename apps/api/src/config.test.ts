import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

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
    })
  })

  it('reads every variable', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://user:pass@db:5432/app',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '8080',
      LOG_LEVEL: 'debug',
    })
    expect(config).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'debug',
      databaseUrl: 'postgresql://user:pass@db:5432/app',
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
