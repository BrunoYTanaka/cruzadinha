import type { GeneratedSourceId } from '@cruzadinha/shared'
import type { GenerationConfig } from './config'
import { recentAnswers } from './modules/puzzles'
import {
  GENERATION_CALLS_WINDOW,
  generationCallKey,
  readGeneratedSettings,
} from './modules/sources'
import type { Database } from './platform/db/client'
import type { Clock } from './platform/lib/clock'
import { createRateLimiter, createRateLimitRepository } from './platform/rate-limit'
import { createGeneratedSource } from './sources/generated/generated'
import type { Provider } from './sources/generated/client'
import type { PuzzleSource } from './sources/types'

// Feature 064: liga cada fonte gerada ao seu provedor e ao banco (configuração do painel, limite de
// chamadas do dia e respostas recentes). Uma fonte gerada nova entra aqui (research R11).

const RECENT_DAYS = 30

export function createGeneratedSources(options: {
  db: Database
  generation: GenerationConfig
  clock: Clock
  fetch?: typeof globalThis.fetch
}): PuzzleSource[] {
  const { db, generation, clock } = options
  const rateLimiter = createRateLimiter(createRateLimitRepository(db))
  const providers: Record<GeneratedSourceId, Provider> = {
    casa: {
      baseUrl: 'https://api.deepseek.com',
      model: generation.deepseekModel,
      apiKey: generation.deepseekApiKey,
    },
  }
  return (Object.keys(providers) as GeneratedSourceId[]).map((id) =>
    createGeneratedSource({
      id,
      provider: providers[id],
      enabled: generation.enabled,
      fetch: options.fetch,
      clock,
      readSettings: () => readGeneratedSettings(db, id),
      reserveCall: async (date) =>
        (
          await rateLimiter.reserve(
            [{ key: generationCallKey(id, date), window: GENERATION_CALLS_WINDOW }],
            clock(),
          )
        ).allowed,
      recentAnswers: (today) => recentAnswers(db, { source: id, today, days: RECENT_DAYS }),
    }),
  )
}
