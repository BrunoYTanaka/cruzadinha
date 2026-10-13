import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Sobe a partir deste arquivo até achar apps/api/drizzle: funciona em src/db/ (tsx) e em dist/.
function findMigrationsFolder(start: string): string {
  let dir = start
  for (;;) {
    const candidate = join(dir, 'drizzle')
    if (existsSync(join(candidate, 'meta', '_journal.json'))) return candidate
    const parent = dirname(dir)
    if (parent === dir) throw new Error('pasta de migrações (drizzle/) não encontrada')
    dir = parent
  }
}

export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} })
  try {
    await migrate(drizzle({ client }), {
      migrationsFolder: findMigrationsFolder(import.meta.dirname),
    })
  } finally {
    await client.end({ timeout: 5 })
  }
}

// Mensagem sem a URL: só o nome e o código do erro do banco.
export function describeMigrationError(error: unknown): string {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error
  if (cause instanceof Error) {
    const code = 'code' in cause && typeof cause.code === 'string' ? ` (${cause.code})` : ''
    return `${cause.name}${code}`
  }
  return 'erro desconhecido'
}
