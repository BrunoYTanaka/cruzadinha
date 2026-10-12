import { describe, expect, it } from 'vitest'
import { describeListenError } from './listen-error'

describe('describeListenError', () => {
  it('names the port when it is already in use', () => {
    const error = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' })
    expect(describeListenError(error, 3000)).toBe(
      'porta 3000 em uso; troque PORT (ou API_PORT no Compose)',
    )
  })

  it('falls back to a generic message for other errors', () => {
    expect(describeListenError(new Error('boom'), 3000)).toBe(
      'não foi possível abrir a porta 3000: boom',
    )
    expect(describeListenError('strange', 3000)).toBe('não foi possível abrir a porta 3000')
  })
})
