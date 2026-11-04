import { describe, expect, it } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it.each([
    ['bruno.tanaka@example.com', 'BT'],
    ['maria_souza@example.com', 'MS'],
    ['bruno@example.com', 'BR'],
    ['a@example.com', 'A'],
    ['joão@example.com', 'JO'],
    ['42@example.com', '42'],
  ])('%s -> %s', (email, expected) => {
    expect(initials(email)).toBe(expected)
  })

  it('nunca devolve vazio', () => {
    expect(initials('...@example.com')).toBe('?')
    expect(initials('')).toBe('?')
  })
})
