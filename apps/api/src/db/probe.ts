import postgres from 'postgres'

export interface DatabaseProbe {
  check(): Promise<boolean>
  close(): Promise<void>
}

export function createPostgresProbe(databaseUrl: string): DatabaseProbe {
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })

  return {
    async check() {
      try {
        await sql`select 1`
        return true
      } catch {
        return false
      }
    },
    async close() {
      await sql.end({ timeout: 5 })
    },
  }
}
