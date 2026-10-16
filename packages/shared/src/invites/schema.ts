import { z } from 'zod'

export const inviteCodeSchema = z
  .string()
  .transform((code) => code.toUpperCase().replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$/))

export const inviteStatusSchema = z.enum(['active', 'used', 'expired', 'revoked'])

export type InviteStatus = z.infer<typeof inviteStatusSchema>

// Resposta: descarta campos desconhecidos para o site anterior aceitar versões novas da API (FR-025).
export const createdInviteSchema = z.object({
  code: z.string().regex(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/),
  expiresAt: z.iso.datetime(),
})

export type CreatedInvite = z.infer<typeof createdInviteSchema>

export const inviteListSchema = z.object({
  invites: z.array(
    z.object({
      createdAt: z.iso.datetime(),
      expiresAt: z.iso.datetime(),
      status: inviteStatusSchema,
    }),
  ),
})

export type InviteList = z.infer<typeof inviteListSchema>
