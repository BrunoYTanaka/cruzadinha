import { loadConfig, loadSeedConfig } from '../config'
import { hashPassword } from '../lib/password'
import { insertIfEmailFree } from '../modules/auth/users.repository'
import type { DatabaseHandle } from './client'

export type SeedDeps = {
  openDatabase: (databaseUrl: string) => DatabaseHandle
  stdout: (text: string) => void
  stderr: (text: string) => void
}

// Seed de desenvolvimento (FR-033): cria a conta de teste sem convite e nunca mexe numa existente.
export async function runSeed(
  env: Record<string, string | undefined>,
  deps: SeedDeps,
): Promise<number> {
  // Recusa antes de exigir DATABASE_URL ou abrir conexão.
  if (env.NODE_ENV === 'production') {
    deps.stderr('O seed só roda em desenvolvimento.\n')
    return 1
  }

  let seed
  let databaseUrl: string
  try {
    seed = loadSeedConfig(env)
    databaseUrl = loadConfig(env).databaseUrl
  } catch (error) {
    deps.stderr(`${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }

  const database = deps.openDatabase(databaseUrl)
  try {
    const passwordHash = await hashPassword(seed.password)
    const created = await insertIfEmailFree(database.db, { email: seed.email, passwordHash })
    deps.stdout(
      created
        ? `Usuário de teste criado: ${seed.email}\n`
        : `Usuário de teste já existe: ${seed.email}\n`,
    )
    return 0
  } finally {
    await database.close()
  }
}
