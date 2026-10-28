import { describe, expect, it } from 'vitest'
import { feminineCount } from './count-words'

describe('feminineCount', () => {
  it.each([
    [1, 'uma'],
    [2, 'duas'],
    [4, 'quatro'],
    [9, 'nove'],
    [10, '10'],
    [0, '0'],
  ])('%i vira %s', (count, words) => {
    expect(feminineCount(count)).toBe(words)
  })
})
