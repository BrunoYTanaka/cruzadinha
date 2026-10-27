import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../../../test/http'
import { ApiRequestError } from '../client/client'
import {
  changeEmail,
  changePassword,
  confirmEmailChange,
  deleteAccount,
  logoutOthers,
} from './account'

afterEach(() => vi.unstubAllGlobals())

describe('account calls', () => {
  it('send the body to each route', async () => {
    const { calls } = mockApi({
      'POST /api/auth/change-password': () => jsonResponse(200, {}),
      'POST /api/auth/logout-others': () => jsonResponse(200, {}),
      'POST /api/auth/change-email': () => jsonResponse(202, { retryAfter: 60 }),
      'POST /api/auth/confirm-email-change': () => jsonResponse(200, {}),
      'POST /api/auth/delete-account': () => jsonResponse(200, {}),
    })

    await changePassword({ currentPassword: 'a', newPassword: 'senha-nova-1' })
    await logoutOthers()
    await expect(changeEmail({ currentPassword: 'a', newEmail: 'n@x.com' })).resolves.toEqual({
      retryAfter: 60,
    })
    await confirmEmailChange({ token: 'A'.repeat(43) })
    await deleteAccount({ currentPassword: 'a' })

    expect(calls.map((call) => call.key)).toHaveLength(5)
    expect(calls[1]?.body).toEqual({})
  })

  it('surface the API error code', async () => {
    mockApi({ 'POST /api/auth/delete-account': () => apiError(400, 'wrong-password') })
    await expect(deleteAccount({ currentPassword: 'x' })).rejects.toMatchObject({
      status: 400,
      code: 'wrong-password',
    })
    expect(new ApiRequestError(404).status).toBe(404)
  })
})
