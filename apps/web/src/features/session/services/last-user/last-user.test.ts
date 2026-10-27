import { beforeEach, describe, expect, it } from 'vitest'
import { clearLastUser, readLastUser, writeLastUser } from './last-user'

const user = { id: '3f1c9a52-1a2b-4c3d-8e4f-0123456789ab', email: 'a@b.com' }

beforeEach(() => localStorage.clear())

describe('last-user', () => {
  it('writes, reads and clears', () => {
    expect(readLastUser()).toBeNull()
    writeLastUser(user)
    expect(readLastUser()).toEqual(user)
    clearLastUser()
    expect(readLastUser()).toBeNull()
  })

  it.each(['{', '"x"', '{"id":1}'])('ignores the invalid value %s', (raw) => {
    localStorage.setItem('cruzadinha:last-user', raw)
    expect(readLastUser()).toBeNull()
  })
})
