import { z } from 'zod'

export const apiErrorCodeSchema = z.enum([
  'invalid-input',
  'invalid-invite',
  'registration-failed',
  'invalid-credentials',
  'unauthenticated',
  'invite-quota-reached',
  'too-many-attempts',
  'puzzle-unavailable',
  'puzzle-source-failed',
  'progress-completed',
  'forbidden',
  'service-unavailable',
  'internal-error',
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorSchema = z.strictObject({
  error: apiErrorCodeSchema,
  message: z.string().min(1),
  fields: z.array(z.string()).optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
