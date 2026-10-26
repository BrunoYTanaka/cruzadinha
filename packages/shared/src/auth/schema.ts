import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const passwordSchema = z.string().min(8).max(128)

export const registerRequestSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>

// Resposta de GET /api/auth/registration: se o cadastro está aberto (feature 013).
export const registrationStatusSchema = z.object({ open: z.boolean() })

export type RegistrationStatus = z.infer<typeof registrationStatusSchema>

// No login a senha só precisa ser texto, para não revelar a regra de tamanho.
export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

// Resposta: descarta campos desconhecidos para o site anterior aceitar versões novas da API (FR-025).
export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
})

export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.object({
  user: userSchema,
})

export type AuthResponse = z.infer<typeof authResponseSchema>
