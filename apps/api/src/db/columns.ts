import { timestamp } from 'drizzle-orm/pg-core'

// Convenção de toda tabela (FR-003): o banco preenche as duas datas na criação, e o trigger
// set_updated_at (migração 0001) avança updated_at a cada alteração, sem depender da aplicação.
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}
