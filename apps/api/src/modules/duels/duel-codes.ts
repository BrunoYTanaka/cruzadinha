import { DUEL_CODE_ALPHABET, DUEL_CODE_LENGTH } from '@cruzadinha/shared'
import { createHash, randomBytes, randomInt } from 'node:crypto'

// Três identificadores que não se misturam (feature 058): token do link, código curto e token do
// participante. Só o do participante é guardado como hash.
export const newLinkToken = (): string => randomBytes(32).toString('base64url')
export const newParticipantToken = (): string => randomBytes(32).toString('base64url')

export function newCode(): string {
  let code = ''
  for (let i = 0; i < DUEL_CODE_LENGTH; i += 1) {
    code += DUEL_CODE_ALPHABET[randomInt(DUEL_CODE_ALPHABET.length)]
  }
  return code
}

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')
