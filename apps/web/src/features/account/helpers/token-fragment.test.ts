import { afterEach, describe, expect, it } from 'vitest'
import { readFragmentToken } from './token-fragment'

const TOKEN = 'a'.repeat(43)

function visit(path: string, hash: string) {
  window.history.replaceState(null, '', `${path}${hash}`)
}

afterEach(() => {
  visit('/', '')
})

describe('readFragmentToken', () => {
  it('reads the token and clears it from the address', () => {
    visit('/verificar-email', `#token=${TOKEN}`)
    expect(readFragmentToken('/p1')).toBe(TOKEN)
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/verificar-email')
  })

  it('repeats the first read when the page asks again (StrictMode)', () => {
    visit('/redefinir-senha', `#token=${TOKEN}`)
    expect(readFragmentToken('/p2')).toBe(TOKEN)
    expect(readFragmentToken('/p2')).toBe(TOKEN)
  })

  it('ignores a malformed token and still clears the address', () => {
    visit('/verificar-email', '#token=curto')
    expect(readFragmentToken('/p3')).toBeUndefined()
    expect(window.location.hash).toBe('')
  })

  it('is undefined without a fragment and keeps the query string', () => {
    visit('/verificar-email', '')
    expect(readFragmentToken('/p4')).toBeUndefined()
    window.history.replaceState(null, '', `/redefinir-senha?x=1#token=${TOKEN}`)
    expect(readFragmentToken('/p5')).toBe(TOKEN)
    expect(window.location.search).toBe('?x=1')
  })
})
