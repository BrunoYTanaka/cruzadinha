import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'
import { runMigrations } from '../db/migrations'

let container: StartedPostgreSqlContainer | undefined

// Um Postgres 17 por execução da suíte, com as migrações aplicadas uma vez.
export async function setup(project: TestProject): Promise<void> {
  // Sem fsync: os dados do teste são descartáveis, a suíte fica mais rápida e as medidas
  // de tempo (SC-007) deixam de oscilar com a gravação em disco.
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withCommand([
      'postgres',
      '-c',
      'fsync=off',
      '-c',
      'synchronous_commit=off',
      '-c',
      'full_page_writes=off',
    ])
    .start()
  const databaseUrl = container.getConnectionUri()
  await runMigrations(databaseUrl)
  project.provide('databaseUrl', databaseUrl)
}

export async function teardown(): Promise<void> {
  await container?.stop()
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}
