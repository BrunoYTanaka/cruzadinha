import { z } from 'zod'

export const inviteCodeSchema = z
  .string()
  .transform((code) => code.toUpperCase().replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$/))

export const inviteStatusSchema = z.enum(['active', 'used', 'expired', 'revoked'])

export type InviteStatus = z.infer<typeof inviteStatusSchema>

export const createdInviteSchema = z.strictObject({
  code: z.string().regex(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/),
  expiresAt: z.iso.datetime(),
})

export type CreatedInvite = z.infer<typeof createdInviteSchema>

export const inviteListSchema = z.strictObject({
  invites: z.array(
    z.strictObject({
      createdAt: z.iso.datetime(),
      expiresAt: z.iso.datetime(),
      status: inviteStatusSchema,
    }),
  ),
})

export type InviteList = z.infer<typeof inviteListSchema>
