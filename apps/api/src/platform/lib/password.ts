import { randomBytes } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'

// Padrões da biblioteca: argon2id, memoryCost 19456 KiB, timeCost 2, parallelism 1.
export function hashPassword(password: string): Promise<string> {
  return hash(password)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

// Hash de um valor aleatório, verificado quando o e-mail não existe para o login gastar o mesmo tempo.
export function createDummyHash(): Promise<string> {
  return hash(randomBytes(32).toString('hex'))
}
