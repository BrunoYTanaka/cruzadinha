import { createHash, randomBytes, randomInt } from 'node:crypto'

// Sem 0, O, 1, I e L, para o código poder ser ditado e digitado sem confusão.
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 16

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]
  }
  return code
}

export function formatInviteCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}
