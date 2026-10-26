import {
  isoDateSchema,
  levelSchema,
  puzzleSourceQuerySchema,
  type PuzzleResponse,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendError, sendTooManyAttempts } from '../../http/errors'
import type { OptionalSession } from '../identity'
import { getPuzzleByDateSchema, getPuzzleByIdSchema } from './puzzles.schemas'
import type { GetPuzzleResult, PuzzlesService } from './puzzles.service'

export type PuzzlesRoutesOptions = {
  puzzles: PuzzlesService
  optionalSession: OptionalSession
}

const querySchema = z.object({
  level: levelSchema.default('daily'),
  date: isoDateSchema,
  source: puzzleSourceQuerySchema,
})

export const puzzlesRoutes: FastifyPluginAsync<PuzzlesRoutesOptions> = async (
  app,
  { puzzles, optionalSession },
) => {
  function sendPuzzleFailure(
    result: Extract<GetPuzzleResult, { ok: false }>,
    request: { log: { warn: (data: object, message: string) => void } },
    reply: Parameters<typeof sendError>[0],
  ) {
    if (result.reason === 'too-many-attempts')
      return sendTooManyAttempts(reply, result.retryAfterSeconds)
    if (result.reason === 'source-failed') {
      // Só o motivo curto vai ao log: nunca token nem corpo da fonte.
      request.log.warn(
        { source: result.source, reason: result.sourceReason },
        'falha ao buscar o puzzle na fonte',
      )
      return sendError(reply, 502, 'puzzle-source-failed')
    }
    return sendError(reply, 404, 'puzzle-unavailable')
  }

  app.get(
    '/api/puzzles',
    // Aberta a visitantes (feature 013): a sessão, se houver, não muda a resposta.
    { schema: getPuzzleByDateSchema, preHandler: optionalSession },
    async (request, reply) => {
      const query = querySchema.safeParse(request.query)
      if (!query.success) {
        const fields = [...new Set(query.error.issues.map((issue) => String(issue.path[0])))]
        return sendError(reply, 400, 'invalid-input', fields)
      }
      const result = await puzzles.getByDate(
        query.data.source,
        query.data.level,
        query.data.date,
        request.clientAddress,
      )
      if (!result.ok) return sendPuzzleFailure(result, request, reply)
      const body: PuzzleResponse = {
        puzzleId: result.puzzleId,
        puzzle: result.puzzle,
        solution: result.solution,
      }
      return body
    },
  )

  app.get(
    '/api/puzzles/:id',
    { schema: getPuzzleByIdSchema, preHandler: optionalSession },
    async (request, reply) => {
      const id = z.uuid().safeParse((request.params as { id?: unknown }).id)
      if (!id.success) return sendError(reply, 404, 'puzzle-unavailable')
      const result = await puzzles.getById(id.data)
      if (!result.ok) return sendPuzzleFailure(result, request, reply)
      const body: PuzzleResponse = {
        puzzleId: result.puzzleId,
        puzzle: result.puzzle,
        solution: result.solution,
      }
      return body
    },
  )
}
