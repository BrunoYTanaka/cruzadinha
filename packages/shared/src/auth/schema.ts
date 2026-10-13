import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const passwordSchema = z.string().min(8).max(128)

export const registerRequestSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  // O formato do código é conferido pelo servidor, para que um código mal formado
  // receba a mesma resposta dos outros convites inválidos (FR-020).
  inviteCode: z.string().min(1).max(64),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>

// No login a senha só precisa ser texto, para não revelar a regra de tamanho.
export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

export const userSchema = z.strictObject({
  id: z.uuid(),
  email: z.string(),
})

export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.strictObject({
  user: userSchema,
})

export type AuthResponse = z.infer<typeof authResponseSchema>
