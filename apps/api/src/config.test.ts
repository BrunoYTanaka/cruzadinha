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

describe('loadConfig e-mail settings', () => {
  const mail = {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_chave-ficticia',
    MAIL_FROM: 'Cruzadinha <nao-responda@example.com>',
    APP_BASE_URL: 'https://cruzadinha.example.com',
  }

  it('reads the sender, the address and the limits', () => {
    const { email } = loadConfig({
      ...mail,
      EMAIL_RESEND_INTERVAL_SECONDS: '120',
      EMAIL_PER_ADDRESS_DAILY_MAX: '3',
      EMAIL_DAILY_CEILING: '50',
      EMAIL_RECOVERY_RESERVE: '10',
    })
    expect(email).toEqual({
      apiKey: 're_chave-ficticia',
      from: 'Cruzadinha <nao-responda@example.com>',
      baseUrl: 'https://cruzadinha.example.com',
      resendIntervalSeconds: 120,
      perAddressDailyMax: 3,
      dailyCeiling: 50,
      recoveryReserve: 10,
    })
  })

  it.each([
    ['EMAIL_RESEND_INTERVAL_SECONDS', '29'],
    ['EMAIL_RESEND_INTERVAL_SECONDS', '3601'],
    ['EMAIL_RESEND_INTERVAL_SECONDS', 'abc'],
    ['EMAIL_PER_ADDRESS_DAILY_MAX', '0'],
    ['EMAIL_DAILY_CEILING', '100'],
    ['EMAIL_RECOVERY_RESERVE', '-1'],
    ['MAIL_FROM', 'sem-arroba'],
    ['APP_BASE_URL', 'https://cruzadinha.example.com/'],
    ['APP_BASE_URL', 'nao-e-url'],
  ])('refuses %s=%s', (name, value) => {
    expect(() => loadConfig({ ...mail, [name]: value })).toThrow(name)
  })

  it('refuses a reserve that is not below the ceiling', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: databaseUrl,
        EMAIL_DAILY_CEILING: '20',
        EMAIL_RECOVERY_RESERVE: '20',
      }),
    ).toThrow('EMAIL_RECOVERY_RESERVE')
  })

  it('requires MAIL_FROM and APP_BASE_URL with the API key', () => {
    expect(() => loadConfig({ DATABASE_URL: databaseUrl, RESEND_API_KEY: 'x' })).toThrow(
      'MAIL_FROM',
    )
    expect(() =>
      loadConfig({ DATABASE_URL: databaseUrl, RESEND_API_KEY: 'x', MAIL_FROM: 'a@b.com' }),
    ).toThrow('APP_BASE_URL')
  })

  it('accepts http only outside production', () => {
    const env = { ...mail, APP_BASE_URL: 'http://localhost:5173' }
    expect(loadConfig(env).email.baseUrl).toBe('http://localhost:5173')
    expect(() => loadConfig({ ...env, NODE_ENV: 'production' })).toThrow('https')
  })

  it('treats empty text as missing', () => {
    const { email } = loadConfig({
      DATABASE_URL: databaseUrl,
      RESEND_API_KEY: '',
      MAIL_FROM: '',
      EMAIL_DAILY_CEILING: '',
    })
    expect(email.apiKey).toBeUndefined()
    expect(email.dailyCeiling).toBe(90)
  })
})

describe('loadConfig', () => {
  it('applies the defaults when only DATABASE_URL is set', () => {
    expect(loadConfig({ DATABASE_URL: databaseUrl })).toEqual({
      nodeEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      databaseUrl,
      trustProxyHops: 0,
      collectHistoryDays: 31,
      proxySecret: undefined,
      releaseCommit: undefined,
      registrationEnabled: false,
      captcha: { enabled: false, secretKey: undefined, hostname: 'localhost' },
      email: {
        apiKey: undefined,
        from: undefined,
        baseUrl: 'http://localhost:5173',
        resendIntervalSeconds: 60,
        perAddressDailyMax: 5,
        dailyCeiling: 90,
        recoveryReserve: 20,
      },
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
      COLLECT_HISTORY_DAYS: '7',
    })
    expect(config).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'debug',
      databaseUrl: 'postgresql://user:pass@db:5432/app',
      trustProxyHops: 2,
      collectHistoryDays: 7,
      proxySecret: undefined,
      releaseCommit: undefined,
      registrationEnabled: false,
      captcha: { enabled: true, secretKey: undefined, hostname: undefined },
      email: {
        apiKey: undefined,
        from: undefined,
        baseUrl: undefined,
        resendIntervalSeconds: 60,
        perAddressDailyMax: 5,
        dailyCeiling: 90,
        recoveryReserve: 20,
      },
    })
  })

  it.each([undefined, ''])('uses 31 days of history when COLLECT_HISTORY_DAYS is %j', (value) => {
    const config = loadConfig({ DATABASE_URL: databaseUrl, COLLECT_HISTORY_DAYS: value })
    expect(config.collectHistoryDays).toBe(31)
  })

  it.each(['0', '1', '365'])('accepts COLLECT_HISTORY_DAYS=%s', (days) => {
    const config = loadConfig({ DATABASE_URL: databaseUrl, COLLECT_HISTORY_DAYS: days })
    expect(config.collectHistoryDays).toBe(Number(days))
  })

  it.each(['-1', '366', '1.5', 'abc'])('fails when COLLECT_HISTORY_DAYS is %s', (days) => {
    const message = errorMessage({ DATABASE_URL: databaseUrl, COLLECT_HISTORY_DAYS: days })
    expect(message).toContain('COLLECT_HISTORY_DAYS: deve ser um inteiro de 0 a 365')
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

describe('loadConfig REGISTRATION_ENABLED', () => {
  it.each([undefined, '', 'false'])('keeps registration closed when the value is %j', (value) => {
    expect(
      loadConfig({ DATABASE_URL: databaseUrl, REGISTRATION_ENABLED: value }).registrationEnabled,
    ).toBe(false)
  })

  it('opens registration with true', () => {
    expect(
      loadConfig({ DATABASE_URL: databaseUrl, REGISTRATION_ENABLED: 'true' }).registrationEnabled,
    ).toBe(true)
  })

  it.each(['1', 'yes', 'talvez', 'TRUE'])('fails on REGISTRATION_ENABLED=%s', (value) => {
    const message = errorMessage({
      DATABASE_URL: secretMarker,
      REGISTRATION_ENABLED: value,
      NODE_ENV: 'bogus',
    })
    expect(message).toContain('REGISTRATION_ENABLED: deve ser true ou false')
    expect(message).not.toContain('SEGREDO')
  })
})

describe('loadConfig PROXY_SECRET e versão publicada', () => {
  it.each([undefined, ''])('has no proxy secret when PROXY_SECRET is %j', (value) => {
    expect(loadConfig({ DATABASE_URL: databaseUrl, PROXY_SECRET: value }).proxySecret).toBe(
      undefined,
    )
  })

  it.each([32, 256])('accepts a PROXY_SECRET of %i characters', (length) => {
    const secret = 'S'.repeat(length)
    expect(loadConfig({ DATABASE_URL: databaseUrl, PROXY_SECRET: secret }).proxySecret).toBe(secret)
  })

  it.each([31, 257])('rejects a PROXY_SECRET of %i characters without echoing it', (length) => {
    const secret = 'SEGREDO'.padEnd(length, 'x')
    const message = errorMessage({ DATABASE_URL: databaseUrl, PROXY_SECRET: secret })
    expect(message).toContain('PROXY_SECRET: deve ter de 32 a 256 caracteres')
    expect(message).not.toContain('SEGREDO')
  })

  it('reads RELEASE_COMMIT', () => {
    const config = loadConfig({ DATABASE_URL: databaseUrl, RELEASE_COMMIT: 'abcdef1' })
    expect(config.releaseCommit).toBe('abcdef1')
  })

  it('falls back to RENDER_GIT_COMMIT', () => {
    const commit = 'a'.repeat(40)
    const config = loadConfig({ DATABASE_URL: databaseUrl, RENDER_GIT_COMMIT: commit })
    expect(config.releaseCommit).toBe(commit)
  })

  it('prefers RELEASE_COMMIT over RENDER_GIT_COMMIT', () => {
    const config = loadConfig({
      DATABASE_URL: databaseUrl,
      RELEASE_COMMIT: 'abcdef1',
      RENDER_GIT_COMMIT: 'b'.repeat(40),
    })
    expect(config.releaseCommit).toBe('abcdef1')
  })

  it('treats empty values as absent', () => {
    const config = loadConfig({
      DATABASE_URL: databaseUrl,
      RELEASE_COMMIT: '',
      RENDER_GIT_COMMIT: '',
    })
    expect(config.releaseCommit).toBe(undefined)
    expect(config.proxySecret).toBe(undefined)
  })

  it.each(['ABCDEF1', 'abcdef', 'xyz1234'])('rejects the commit %s', (commit) => {
    expect(errorMessage({ DATABASE_URL: databaseUrl, RELEASE_COMMIT: commit })).toContain(
      'deve ser um SHA de 7 a 40 caracteres hexadecimais',
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

describe('loadConfig com PROXY_SECRET obrigatório em produção', () => {
  const production = { DATABASE_URL: databaseUrl, NODE_ENV: 'production', CAPTCHA_ENABLED: 'false' }
  const require = { requireProxySecret: true }

  function failure(env: Record<string, string | undefined>): string {
    try {
      loadConfig(env, require)
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
    throw new Error('loadConfig did not fail')
  }

  it.each([undefined, ''])('refuses production when PROXY_SECRET is %j', (value) => {
    expect(failure({ ...production, PROXY_SECRET: value })).toContain(
      'PROXY_SECRET: obrigatório em produção',
    )
  })

  it('starts in production with the secret', () => {
    const secret = 'S'.repeat(32)
    expect(loadConfig({ ...production, PROXY_SECRET: secret }, require).proxySecret).toBe(secret)
  })

  it.each(['development', 'test'])('starts in %s without the secret', (nodeEnv) => {
    expect(() =>
      loadConfig({ DATABASE_URL: databaseUrl, NODE_ENV: nodeEnv }, require),
    ).not.toThrow()
  })

  it('does not require the secret without the option (author CLI)', () => {
    expect(() => loadConfig(production)).not.toThrow()
  })

  it('accepts ALLOW_MISSING_PROXY_SECRET=true in production', () => {
    expect(() =>
      loadConfig({ ...production, ALLOW_MISSING_PROXY_SECRET: 'true' }, require),
    ).not.toThrow()
  })

  it.each([undefined, '', 'false'])(
    'still refuses when ALLOW_MISSING_PROXY_SECRET is %j',
    (value) => {
      expect(failure({ ...production, ALLOW_MISSING_PROXY_SECRET: value })).toContain(
        'PROXY_SECRET',
      )
    },
  )

  it('rejects an ALLOW_MISSING_PROXY_SECRET that is not true or false', () => {
    expect(failure({ ...production, ALLOW_MISSING_PROXY_SECRET: 'talvez' })).toContain(
      'ALLOW_MISSING_PROXY_SECRET: deve ser true ou false',
    )
  })

  it('never echoes the secret in the message', () => {
    expect(failure({ ...production, PROXY_SECRET: 'SEGREDO' })).not.toContain('SEGREDO')
  })
})

describe('loadConfig CAPTCHA_ENABLED e TURNSTILE_SECRET_KEY', () => {
  const server = { requireProxySecret: true }
  const base = { DATABASE_URL: databaseUrl }
  const production = {
    ...base,
    NODE_ENV: 'production',
    PROXY_SECRET: 'S'.repeat(32),
    APP_BASE_URL: 'https://cruzadinha.example.com',
  }

  function failure(env: Record<string, string | undefined>): string {
    try {
      loadConfig(env, server)
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
    throw new Error('loadConfig did not fail')
  }

  it.each([undefined, ''])('defaults to off outside production when the value is %j', (value) => {
    expect(loadConfig({ ...base, CAPTCHA_ENABLED: value }, server).captcha.enabled).toBe(false)
  })

  it.each([undefined, ''])('defaults to on in production when the value is %j', (value) => {
    const env = { ...production, TURNSTILE_SECRET_KEY: 'segredo-ficticio', CAPTCHA_ENABLED: value }
    expect(loadConfig(env, server).captcha.enabled).toBe(true)
  })

  it('reads the secret and takes the host from APP_BASE_URL', () => {
    const { captcha } = loadConfig(
      { ...production, CAPTCHA_ENABLED: 'true', TURNSTILE_SECRET_KEY: 'segredo-ficticio' },
      server,
    )
    expect(captcha).toEqual({
      enabled: true,
      secretKey: 'segredo-ficticio',
      hostname: 'cruzadinha.example.com',
    })
  })

  it('refuses to start with the captcha on and no secret', () => {
    expect(failure({ ...production, CAPTCHA_ENABLED: 'true' })).toContain(
      'TURNSTILE_SECRET_KEY: obrigatória com CAPTCHA_ENABLED=true',
    )
    expect(failure({ ...production })).toContain('TURNSTILE_SECRET_KEY: obrigatória')
  })

  it('refuses the captcha on in production without APP_BASE_URL', () => {
    const env = { ...production, APP_BASE_URL: undefined, TURNSTILE_SECRET_KEY: 'segredo-ficticio' }
    expect(failure(env)).toContain('APP_BASE_URL: obrigatória com CAPTCHA_ENABLED=true')
  })

  it('starts with the captcha off and no secret, and does not check it for the author CLI', () => {
    expect(() => loadConfig({ ...production, CAPTCHA_ENABLED: 'false' }, server)).not.toThrow()
    expect(() => loadConfig({ ...production })).not.toThrow()
  })

  it('never puts the secret in an error message', () => {
    const message = failure({
      ...production,
      CAPTCHA_ENABLED: 'true',
      TURNSTILE_SECRET_KEY: 'x'.repeat(600),
    })
    expect(message).not.toContain('xxxxxxxxxx')
  })

  it.each(['1', 'yes', 'TRUE'])('fails on CAPTCHA_ENABLED=%s', (value) => {
    expect(errorMessage({ ...base, CAPTCHA_ENABLED: value })).toContain(
      'CAPTCHA_ENABLED: deve ser true ou false',
    )
  })
})
