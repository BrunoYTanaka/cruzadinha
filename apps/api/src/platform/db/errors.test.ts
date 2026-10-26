import { DrizzleQueryError } from 'drizzle-orm/errors'
import { describe, expect, it } from 'vitest'
import { describeError, isConnectionError } from './errors'

function withCode(code: string): Error {
  return Object.assign(new Error('falha'), { code })
}

describe('isConnectionError', () => {
  it.each(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'CONNECT_TIMEOUT', 'CONNECTION_CLOSED'])(
    'recognizes %s',
    (code) => {
      expect(isConnectionError(withCode(code))).toBe(true)
    },
  )

  it('looks inside the Drizzle wrapper and aggregated errors', () => {
    expect(isConnectionError(new DrizzleQueryError('select 1', [], withCode('ECONNREFUSED')))).toBe(
      true,
    )
    expect(isConnectionError(new AggregateError([withCode('ECONNREFUSED')]))).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isConnectionError(withCode('23505'))).toBe(false)
    expect(isConnectionError(new Error('boom'))).toBe(false)
    expect(isConnectionError('texto')).toBe(false)
  })
})

describe('describeError', () => {
  it('keeps only names and codes, never the query parameters', () => {
    const error = new DrizzleQueryError('insert ...', ['$argon2id$SEGREDO'], withCode('23505'))
    const description = describeError(error)
    expect(description).toEqual([{ name: 'Error' }, { name: 'Error', code: '23505' }])
    expect(JSON.stringify(description)).not.toContain('SEGREDO')
  })
})
