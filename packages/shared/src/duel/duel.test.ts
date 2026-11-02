import { describe, expect, it } from 'vitest'
import {
  createDuelRequestSchema,
  duelCodeSchema,
  duelRulesSchema,
  myDuelsRequestSchema,
  startDuelRequestSchema,
} from './duel'

const rules = { helpMode: 'free', helpPenaltyMs: null, maxMs: null, startDeadlineHours: 24 }
const token = 'a'.repeat(43)

describe('duelRulesSchema', () => {
  it('accepts free help without penalty', () => {
    expect(duelRulesSchema.safeParse(rules).success).toBe(true)
  })

  it('refuses penalty mode without a penalty value', () => {
    expect(duelRulesSchema.safeParse({ ...rules, helpMode: 'penalty' }).success).toBe(false)
  })

  it('refuses a penalty value outside penalty mode', () => {
    expect(duelRulesSchema.safeParse({ ...rules, helpPenaltyMs: 30000 }).success).toBe(false)
  })

  it('refuses a max time below one minute and a deadline outside the options', () => {
    expect(duelRulesSchema.safeParse({ ...rules, maxMs: 1000 }).success).toBe(false)
    expect(duelRulesSchema.safeParse({ ...rules, startDeadlineHours: 5 }).success).toBe(false)
  })
})

describe('request schemas', () => {
  const id = '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

  it('refuses an extra key and an empty nickname', () => {
    expect(
      createDuelRequestSchema.safeParse({ puzzleId: id, rules, nickname: 'Ana', extra: 1 }).success,
    ).toBe(false)
    expect(createDuelRequestSchema.safeParse({ puzzleId: id, rules, nickname: '  ' }).success).toBe(
      false,
    )
  })

  it('refuses a nickname above 24 characters', () => {
    const nickname = 'x'.repeat(25)
    expect(startDuelRequestSchema.safeParse({ linkToken: token, nickname }).success).toBe(false)
  })

  it('refuses 21 participant tokens', () => {
    const participantTokens = Array.from({ length: 21 }, () => token)
    expect(myDuelsRequestSchema.safeParse({ participantTokens }).success).toBe(false)
    expect(
      myDuelsRequestSchema.safeParse({ participantTokens: participantTokens.slice(1) }).success,
    ).toBe(true)
  })
})

describe('duelCodeSchema', () => {
  it('accepts 8 characters of the alphabet', () => {
    expect(duelCodeSchema.safeParse('23456789').success).toBe(true)
  })

  it.each(['0ABCDEFG', 'OABCDEFG', '1ABCDEFG', 'IABCDEFG', 'LABCDEFG', 'ABC', 'abcdefgh'])(
    'refuses %s',
    (code) => {
      expect(duelCodeSchema.safeParse(code).success).toBe(false)
    },
  )
})
