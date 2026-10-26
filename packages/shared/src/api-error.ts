import { z } from 'zod'

export const apiErrorCodeSchema = z.enum([
  'invalid-input',
  // Obsoletos desde a feature 013 (sem convites); saem no lançamento B.
  'invalid-invite',
  'registration-failed',
  'registration-closed',
  'invalid-credentials',
  'unauthenticated',
  // Obsoleto desde a feature 013; sai no lançamento B.
  'invite-quota-reached',
  'too-many-attempts',
  'puzzle-unavailable',
  'puzzle-source-failed',
  'progress-completed',
  'forbidden',
  'service-unavailable',
  'internal-error',
  // Confirmação de e-mail e recuperação de senha (feature 034).
  'invalid-token',
  'email-unavailable',
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorSchema = z.strictObject({
  error: apiErrorCodeSchema,
  message: z.string().min(1),
  fields: z.array(z.string()).optional(),
  // Segundos até a próxima tentativa (feature 034).
  retryAfter: z.number().int().min(1).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
