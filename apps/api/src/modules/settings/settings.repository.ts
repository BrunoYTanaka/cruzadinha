import type { SaveSettingsRequest } from '@cruzadinha/shared'
import { eq, lt, sql } from 'drizzle-orm'
import type { Executor } from '../../db/client'
import { userSettings } from '../../db/schema'

// `settings` chega do banco como unknown e é relido pelo serviço.
export type StoredSettings = { settings: unknown; savedAt: Date }

export async function findSettings(
  db: Executor,
  userId: string,
): Promise<StoredSettings | undefined> {
  const [row] = await db
    .select({ settings: userSettings.settings, savedAt: userSettings.savedAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
  return row
}

// Grava só se o `savedAt` for mais novo que o guardado: dois pedidos simultâneos fora de ordem
// também respeitam a regra (FR-022). Devolve a linha que vale depois.
export async function upsertSettings(
  db: Executor,
  userId: string,
  settings: SaveSettingsRequest['settings'],
  savedAt: Date,
): Promise<StoredSettings | undefined> {
  await db
    .insert(userSettings)
    .values({ userId, settings, savedAt })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings: sql.raw('excluded.settings'), savedAt: sql.raw('excluded.saved_at') },
      setWhere: lt(userSettings.savedAt, sql.raw('excluded.saved_at')),
    })
  return findSettings(db, userId)
}
