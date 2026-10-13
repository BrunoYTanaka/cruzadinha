import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export type Database = PostgresJsDatabase

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

// Banco ou transação: os repositórios aceitam os dois.
export type Executor = Database | Transaction

export type DatabaseHandle = {
  db: Database
  close(): Promise<void>
}

// O cliente do postgres.js é preguiçoso: só conecta na primeira consulta.
export function createDatabase(databaseUrl: string): DatabaseHandle {
  const client = postgres(databaseUrl, { onnotice: () => {} })
  return {
    db: drizzle({ client }),
    async close() {
      await client.end({ timeout: 5 })
    },
  }
}
