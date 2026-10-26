import { defineConfig } from 'drizzle-kit'

// Só gera migrações (npm run db:generate); aplicá-las é com npm run db:migrate.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/platform/db/schema.ts',
  out: './drizzle',
})
