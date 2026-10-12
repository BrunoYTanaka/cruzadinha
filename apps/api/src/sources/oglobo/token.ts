import { randomBytes } from 'node:crypto'

/** Identificação anônima de visitante no formato aceito pela Agilmente. */
export function generateAnonymousToken(): string {
  return `ANONYMOUS-${randomBytes(16).toString('hex')}-ANONYMOUS`
}
