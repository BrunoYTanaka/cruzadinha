import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const drainOutboxes = vi.hoisted(() => vi.fn(async () => undefined))
const state = vi.hoisted(() => ({ ready: true, online: true }))
vi.mock('../../services/drain/drain', () => ({ drainOutboxes }))
vi.mock('../../../../shared/hooks/useSlowServer/useSlowServer', () => ({
  useServerReady: () => state.ready,
}))
vi.mock('../../../../shared/hooks/useOnline/useOnline', () => ({ useOnline: () => state.online }))

import { useOutboxDrain } from './useOutboxDrain'

beforeEach(() => {
  drainOutboxes.mockClear()
  state.ready = true
  state.online = true
})

describe('useOutboxDrain', () => {
  it('esvazia a fila da conta quando o servidor está pronto e há rede', () => {
    renderHook(() => useOutboxDrain('u1', 'p1'))
    expect(drainOutboxes).toHaveBeenCalledWith('u1', { skipPuzzleId: 'p1' })
  })

  it.each([
    ['sem conta', null, true, true],
    ['sem rede', 'u1', true, false],
    ['servidor ainda dormindo', 'u1', false, true],
  ])('não faz nada %s', (_name, userId, ready, online) => {
    state.ready = ready
    state.online = online
    renderHook(() => useOutboxDrain(userId, null))
    expect(drainOutboxes).not.toHaveBeenCalled()
  })
})
