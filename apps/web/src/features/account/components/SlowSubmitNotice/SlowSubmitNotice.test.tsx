import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SLOW_MESSAGE } from '../../../../shared/components/LoadingState/loading-screens'
import { SlowSubmitNotice } from './SlowSubmitNotice'

describe('SlowSubmitNotice', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('só explica depois de 2 s de envio e some quando termina', () => {
    const { rerender } = render(<SlowSubmitNotice pending={false} />)
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
    rerender(<SlowSubmitNotice pending />)
    act(() => vi.advanceTimersByTime(1_900))
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText(SLOW_MESSAGE)).toBeInTheDocument()
    rerender(<SlowSubmitNotice pending={false} />)
    expect(screen.queryByText(SLOW_MESSAGE)).toBeNull()
  })
})
