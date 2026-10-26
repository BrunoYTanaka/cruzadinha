import {
  parseStoredSettings,
  type SaveSettingsRequest,
  type SettingsEnvelope,
} from '@cruzadinha/shared'
import type { Database } from '../../platform/db/client'
import type { Clock } from '../../platform/lib/clock'
import { savedAtTooFar } from '../../platform/lib/saved-at'
import { admitAddress, type RateWindow, type RateLimiter } from '../../platform/rate-limit'
import { findSettings, upsertSettings, type StoredSettings } from './settings.repository'

export type SettingsSaveDecision =
  { kind: 'apply'; savedAt: Date } | { kind: 'unchanged' } | { kind: 'invalid-saved-at' }

// Regra de gravação sem banco: vence a mudança mais recente do aparelho (FR-022), com a mesma
// tolerância de relógio do progresso.
export function decideSettingsSave(
  current: Pick<StoredSettings, 'savedAt'> | undefined,
  request: SaveSettingsRequest,
  now: Date,
): SettingsSaveDecision {
  if (savedAtTooFar(request.savedAt, now)) return { kind: 'invalid-saved-at' }
  const savedAt = new Date(request.savedAt)
  if (current && savedAt.getTime() <= current.savedAt.getTime()) return { kind: 'unchanged' }
  return { kind: 'apply', savedAt }
}

// O servidor devolve só os campos válidos, sem padrões: os padrões de ajuda são do site.
function toEnvelope(stored: StoredSettings | undefined): SettingsEnvelope {
  return stored
    ? { settings: parseStoredSettings(stored.settings), savedAt: stored.savedAt.toISOString() }
    : { settings: null, savedAt: null }
}

export type SaveSettingsResult =
  | { ok: true; envelope: SettingsEnvelope }
  | { ok: false; reason: 'invalid-input'; fields: string[] }
  | { ok: false; reason: 'too-many-attempts'; retryAfterSeconds: number }

export type SettingsService = {
  get(userId: string): Promise<SettingsEnvelope>
  save(userId: string, request: SaveSettingsRequest, address: string): Promise<SaveSettingsResult>
}

export type SettingsDeps = {
  db: Database
  clock: Clock
  rateLimiter: RateLimiter
  limits: { settingsSave: RateWindow }
}

export function createSettingsService({
  db,
  clock,
  rateLimiter,
  limits,
}: SettingsDeps): SettingsService {
  return {
    async get(userId) {
      return toEnvelope(await findSettings(db, userId))
    },

    async save(userId, request, address) {
      const now = clock()
      const limit = await admitAddress(
        rateLimiter,
        now,
        'SETTINGS_SAVE',
        address,
        limits.settingsSave,
      )
      if (!limit.ok) {
        return {
          ok: false,
          reason: 'too-many-attempts',
          retryAfterSeconds: limit.retryAfterSeconds,
        }
      }

      const current = await findSettings(db, userId)
      const decision = decideSettingsSave(current, request, now)
      switch (decision.kind) {
        case 'invalid-saved-at':
          return { ok: false, reason: 'invalid-input', fields: ['savedAt'] }
        case 'unchanged':
          return { ok: true, envelope: toEnvelope(current) }
        case 'apply':
          return {
            ok: true,
            envelope: toEnvelope(
              await upsertSettings(db, userId, request.settings, decision.savedAt),
            ),
          }
      }
    },
  }
}
