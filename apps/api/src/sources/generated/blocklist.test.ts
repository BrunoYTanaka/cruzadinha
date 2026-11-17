import { describe, expect, it } from 'vitest'
import { isBlocked, isBlockedAnswer } from './blocklist'

describe('isBlocked', () => {
  it('acha um termo como palavra inteira, sem acento e sem diferença de maiúsculas', () => {
    expect(isBlocked('Que MERDA de dia')).toBe(true)
    expect(isBlocked('Droga como a cocaína')).toBe(true)
  })

  it('não acusa um termo dentro de outra palavra', () => {
    expect(isBlocked('Fruta do maracujá')).toBe(false)
    expect(isBlocked('Computador portátil')).toBe(false)
  })

  it('não acusa palavras comuns parecidas', () => {
    expect(isBlocked('A heroína da história')).toBe(false)
    expect(isBlocked('O macaco pula de galho')).toBe(false)
  })
})

describe('isBlockedAnswer', () => {
  it('recusa uma resposta que é um termo bloqueado', () => {
    expect(isBlockedAnswer('PORRA')).toBe(true)
    expect(isBlockedAnswer('PORTA')).toBe(false)
  })
})
