import type { ApiError, ApiErrorCode } from '@cruzadinha/shared'
import type { FastifyReply } from 'fastify'

export const errorMessages: Record<ApiErrorCode, string> = {
  'invalid-input': 'Dados inválidos.',
  'invalid-invite': 'Convite inválido.',
  'registration-failed': 'Não foi possível concluir o cadastro.',
  'registration-closed': 'O cadastro está fechado no momento.',
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
  'invalid-token': 'Link inválido ou vencido.',
  'email-unavailable': 'Não foi possível enviar o e-mail agora.',
  'wrong-password': 'A senha atual não confere.',
  'captcha-failed': 'Não foi possível confirmar que você é uma pessoa. Tente de novo.',
}

export function apiError(code: ApiErrorCode, fields?: string[], retryAfter?: number): ApiError {
  return {
    error: code,
    message: errorMessages[code],
    ...(fields ? { fields } : {}),
    ...(retryAfter ? { retryAfter } : {}),
  }
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: ApiErrorCode,
  fields?: string[],
  retryAfter?: number,
): FastifyReply {
  return reply.status(status).send(apiError(code, fields, retryAfter))
}

// `retryAfter` no corpo só nas rotas de e-mail (feature 035): o site anterior valida o corpo do
// erro de forma estrita e recusaria a chave nova no 429 do login.
export function sendTooManyAttempts(
  reply: FastifyReply,
  retryAfterSeconds: number,
  options: { withRetryAfterBody?: boolean } = {},
): FastifyReply {
  return sendError(
    reply.header('retry-after', String(retryAfterSeconds)),
    429,
    'too-many-attempts',
    undefined,
    options.withRetryAfterBody ? retryAfterSeconds : undefined,
  )
}

// Cota do provedor esgotada ou envio desligado: o site mostra um aviso genérico (feature 035).
export function sendEmailUnavailable(reply: FastifyReply, retryAfterSeconds: number): FastifyReply {
  return sendError(
    reply.header('retry-after', String(retryAfterSeconds)),
    503,
    'email-unavailable',
    undefined,
    retryAfterSeconds,
  )
}

// Captcha recusado (feature 049): sempre o mesmo erro, com ou sem conta, e nunca 401 nem 403.
export function sendCaptchaFailed(reply: FastifyReply): FastifyReply {
  return sendError(reply, 400, 'captcha-failed')
}
