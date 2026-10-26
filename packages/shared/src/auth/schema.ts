import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const passwordSchema = z.string().min(8).max(128)

// O cadastro só pede o link (feature 035): a senha é escolhida por quem abre o link, para ninguém
// poder cadastrar o e-mail de outra pessoa com uma senha que só essa pessoa conhece.
export const registerRequestSchema = z.strictObject({
  email: emailSchema,
  // Aceito e ignorado só para o site anterior, que ainda o envia; sai no lançamento B
  // (feature 013, research R15).
  inviteCode: z.string().max(64).optional(),
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

// Confirmação de e-mail e recuperação de senha (feature 035).
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

export const resendVerificationRequestSchema = z.strictObject({ email: emailSchema })

export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>

export const forgotPasswordRequestSchema = z.strictObject({ email: emailSchema })

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>

export const verifyEmailRequestSchema = z.strictObject({
  token: tokenSchema,
  password: passwordSchema,
})

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>

export const resetPasswordRequestSchema = z.strictObject({
  token: tokenSchema,
  password: passwordSchema,
})

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>

// Resposta de cadastro, reenvio e recuperação: igual com ou sem conta ou pendência.
export const emailRequestAcceptedSchema = z.object({
  retryAfter: z.number().int().min(1),
})

export type EmailRequestAccepted = z.infer<typeof emailRequestAcceptedSchema>
