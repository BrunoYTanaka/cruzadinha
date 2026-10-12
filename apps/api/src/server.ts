import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildApp } from './app'
import { loadConfig, type ServerConfig } from './config'
import { createPostgresProbe } from './db/probe'
import { describeListenError } from './listen-error'

function findEnvFile(start: string): string | undefined {
  let dir = start
  for (;;) {
    const candidate = join(dir, '.env')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

if (process.env.NODE_ENV !== 'production') {
  const envFile = findEnvFile(process.cwd())
  if (envFile) process.loadEnvFile(envFile)
}

let config: ServerConfig
try {
  config = loadConfig(process.env)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

const probe = createPostgresProbe(config.databaseUrl)
const app = buildApp({ config, probe })

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  process.stderr.write(`${describeListenError(error, config.port)}\n`)
  await probe.close()
  process.exit(1)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app
      .close()
      .then(() => probe.close())
      .then(() => process.exit(0))
  })
}
