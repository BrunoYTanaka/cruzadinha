import {
  createDuelRequestSchema,
  duelRefRequestSchema,
  finishDuelRequestSchema,
  lookupDuelRequestSchema,
  myDuelsRequestSchema,
  startDuelRequestSchema,
} from '@cruzadinha/shared'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import { sendError, sendTooManyAttempts } from '../../platform/http/errors'
import type { OptionalSession } from '../identity'
import {
  cancelDuelSchema,
  createDuelSchema,
  declineDuelSchema,
  finishDuelSchema,
  forfeitDuelSchema,
  lookupDuelSchema,
  myDuelsSchema,
  startDuelSchema,
  stateDuelSchema,
} from './duels.schemas'
import type { Actor, DuelsService, Failure } from './duels.service'

export type DuelsRoutesOptions = {
  duels: DuelsService
  optionalSession: OptionalSession
}

// Só o primeiro nível do caminho: nomes de campos, nunca valores (apelido, tokens, código).
function parse<S extends z.ZodType>(schema: S, body: unknown, reply: FastifyReply) {
  const parsed = schema.safeParse(body)
  if (parsed.success) return parsed.data as z.infer<S>
  const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'body')))]
  sendError(reply, 400, 'invalid-input', fields)
  return undefined
}

function sendFailure(reply: FastifyReply, failure: Failure) {
  switch (failure.reason) {
    case 'too-many-attempts':
      return sendTooManyAttempts(reply, failure.retryAfterSeconds)
    case 'not-found':
      return sendError(reply, 404, 'not-found')
    case 'puzzle-unavailable':
      return sendError(reply, 404, 'puzzle-unavailable')
    case 'duel-taken':
      return sendError(reply, 409, 'duel-taken')
    case 'open-limit':
      return sendError(reply, 409, 'open-limit')
    case 'not-running':
      return sendError(reply, 409, 'not-running')
    case 'not-open':
      return sendError(reply, 409, 'not-open')
  }
}

const actorOf = (request: FastifyRequest, participantToken?: string): Actor => ({
  userId: request.user?.id ?? null,
  ...(participantToken ? { participantToken } : {}),
})

export const duelsRoutes: FastifyPluginAsync<DuelsRoutesOptions> = async (
  app,
  { duels, optionalSession },
) => {
  const pre = optionalSession

  app.post('/api/duels', { schema: createDuelSchema, preHandler: pre }, async (request, reply) => {
    const body = parse(createDuelRequestSchema, request.body, reply)
    if (!body) return reply
    const result = await duels.create(actorOf(request), request.clientAddress, body)
    return result.ok ? result.body : sendFailure(reply, result)
  })

  app.post(
    '/api/duels/lookup',
    { schema: lookupDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(lookupDuelRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.lookup(request.clientAddress, body)
      return result.ok ? result.body : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/start',
    { schema: startDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(startDuelRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.start(actorOf(request, body.participantToken), body)
      return result.ok ? result.body : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/decline',
    { schema: declineDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(duelRefRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.decline(actorOf(request, body.participantToken), body)
      return result.ok ? { declined: true as const } : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/state',
    { schema: stateDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(duelRefRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.state(actorOf(request, body.participantToken), body)
      return result.ok ? result.body : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/finish',
    { schema: finishDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(finishDuelRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.finish(actorOf(request, body.participantToken), body)
      return result.ok ? { duel: result.duel } : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/forfeit',
    { schema: forfeitDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(duelRefRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.forfeit(actorOf(request, body.participantToken), body)
      return result.ok ? { duel: result.duel } : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/cancel',
    { schema: cancelDuelSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(duelRefRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.cancel(actorOf(request, body.participantToken), body)
      return result.ok ? { duel: result.duel } : sendFailure(reply, result)
    },
  )

  app.post(
    '/api/duels/mine',
    { schema: myDuelsSchema, preHandler: pre },
    async (request, reply) => {
      const body = parse(myDuelsRequestSchema, request.body, reply)
      if (!body) return reply
      const result = await duels.mine(
        actorOf(request),
        request.clientAddress,
        body.participantTokens ?? [],
      )
      return result.ok ? { duels: result.duels } : sendFailure(reply, result)
    },
  )
}
