import type { ApiError, ApiErrorCode } from '@cruzadinha/shared'
import type { FastifyReply } from 'fastify'

export const errorMessages: Record<ApiErrorCode, string> = {
  'invalid-input': 'Dados inválidos.',
  'invalid-invite': 'Convite inválido.',
  'registration-failed': 'Não foi possível concluir o cadastro.',
  'invalid-credentials': 'E-mail ou senha incorretos.',
  unauthenticated: 'Não autenticado.',
  'invite-quota-reached': 'Você já tem 3 convites ativos.',
  'too-many-attempts': 'Muitas tentativas, tente mais tarde.',
  'puzzle-unavailable': 'Puzzle indisponível.',
  'puzzle-source-failed': 'Não foi possível buscar o puzzle agora, tente mais tarde.',
  'progress-completed': 'Este puzzle já foi concluído; reinicie para jogar de novo.',
  forbidden: 'Acesso negado.',
  'service-unavailable': 'Serviço indisponível, tente mais tarde.',
  'internal-error': 'Erro interno.',
}

export function apiError(code: ApiErrorCode, fields?: string[]): ApiError {
  return fields
    ? { error: code, message: errorMessages[code], fields }
    : { error: code, message: errorMessages[code] }
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: ApiErrorCode,
  fields?: string[],
): FastifyReply {
  return reply.status(status).send(apiError(code, fields))
}

export function sendTooManyAttempts(reply: FastifyReply, retryAfterSeconds: number): FastifyReply {
  return sendError(reply.header('retry-after', String(retryAfterSeconds)), 429, 'too-many-attempts')
}
