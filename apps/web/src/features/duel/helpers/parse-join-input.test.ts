import { describe, expect, it } from 'vitest'
import { parseJoinInput } from './parse-join-input'

const TOKEN = 'a'.repeat(43)

describe('parseJoinInput', () => {
  it.each([
    ['23456789', { code: '23456789' }],
    ['  abcd-efgh ', { code: 'ABCDEFGH' }],
    ['ABCD EFGH', { code: 'ABCDEFGH' }],
  ])('reads the code %j', (input, expected) => {
    expect(parseJoinInput(input)).toEqual(expected)
  })

  it('reads a pasted link with or without the origin, query or fragment', () => {
    const expected = { linkToken: TOKEN }
    expect(parseJoinInput(`https://cruzadinha.example/x1/${TOKEN}`)).toEqual(expected)
    expect(parseJoinInput(`/x1/${TOKEN}`)).toEqual(expected)
    expect(parseJoinInput(` https://x.test/x1/${TOKEN}?a=1 `)).toEqual(expected)
    expect(parseJoinInput(`https://x.test/x1/${TOKEN}#p=segredo`)).toEqual(expected)
  })

  it.each(['', '   ', '0OIL1234', 'ABC', 'ABCDEFGHI', 'https://x.test/outra/rota', '/x1/curto'])(
    'refuses %j',
    (input) => {
      expect(parseJoinInput(input)).toBeNull()
    },
  )
})
