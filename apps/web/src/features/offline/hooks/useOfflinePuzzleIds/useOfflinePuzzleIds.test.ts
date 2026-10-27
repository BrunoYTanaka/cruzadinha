import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makePuzzleResponse, PUZZLE_ID, TINY } from '../../../../test/fixtures'
import { savePuzzle } from '../../services/offline-store/offline-store'
import { useOfflinePuzzleIds } from './useOfflinePuzzleIds'

describe('useOfflinePuzzleIds', () => {
  it('lista as guardadas e acompanha novas gravações', async () => {
    const { result } = renderHook(() => useOfflinePuzzleIds())
    expect(result.current.size).toBe(0)
    await savePuzzle(makePuzzleResponse(TINY))
    await waitFor(() => expect(result.current.has(PUZZLE_ID)).toBe(true))
  })
})
