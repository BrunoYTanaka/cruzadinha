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
  // O Neon derruba as conexões ao suspender (5 min sem uso); fechar as ociosas antes disso evita
  // falhar a primeira consulta depois da suspensão (feature 012, research R7).
  const client = postgres(databaseUrl, { onnotice: () => {}, idle_timeout: 60 })
  return {
    db: drizzle({ client }),
    async close() {
      await client.end({ timeout: 5 })
    },
  }
}
