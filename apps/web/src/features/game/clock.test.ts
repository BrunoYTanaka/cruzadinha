import { describe, expect, it } from 'vitest'
import { MAX_ELAPSED_MS } from '../../lib/time'
import { createClock } from './clock'

function makeClock(initialMs = 0) {
  let time = 0
  const clock = createClock({ initialMs, now: () => time })
  return {
    clock,
    advance: (ms: number) => {
      time += ms
    },
  }
}

describe('createClock', () => {
  it('só corre depois de iniciado e acumula o tempo', () => {
    const { clock, advance } = makeClock()
    advance(5_000)
    expect(clock.elapsedMs()).toBe(0)
    clock.start()
    advance(3_000)
    expect(clock.elapsedMs()).toBe(3_000)
    advance(2_000)
    expect(clock.elapsedMs()).toBe(5_000)
  })

  it('parte do tempo já jogado (elapsedMs do progresso)', () => {
    const { clock, advance } = makeClock(65_000)
    clock.start()
    advance(1_000)
    expect(clock.elapsedMs()).toBe(66_000)
  })

  it('para ao ocultar a aba e retoma ao voltar', () => {
    const { clock, advance } = makeClock()
    clock.start()
    advance(2_000)
    clock.setHidden(true)
    advance(60_000)
    expect(clock.elapsedMs()).toBe(2_000)
    expect(clock.isRunning()).toBe(false)
    clock.setHidden(false)
    advance(1_000)
    expect(clock.elapsedMs()).toBe(3_000)
  })

  it('para ao pausar e só retoma quando a pessoa retoma', () => {
    const { clock, advance } = makeClock()
    clock.start()
    advance(2_000)
    clock.pause()
    expect(clock.isPaused()).toBe(true)
    advance(10_000)
    expect(clock.elapsedMs()).toBe(2_000)
    // voltar à aba não retoma uma pausa manual
    clock.setHidden(true)
    clock.setHidden(false)
    advance(10_000)
    expect(clock.elapsedMs()).toBe(2_000)
    clock.resume()
    advance(1_000)
    expect(clock.elapsedMs()).toBe(3_000)
  })

  it('para de vez ao concluir', () => {
    const { clock, advance } = makeClock()
    clock.start()
    advance(4_000)
    clock.stop()
    advance(10_000)
    clock.setHidden(false)
    clock.resume()
    expect(clock.elapsedMs()).toBe(4_000)
    expect(clock.isRunning()).toBe(false)
  })

  it('respeita o máximo de 7 dias', () => {
    const { clock, advance } = makeClock(MAX_ELAPSED_MS - 1_000)
    clock.start()
    advance(60_000)
    expect(clock.elapsedMs()).toBe(MAX_ELAPSED_MS)
    expect(makeClock(MAX_ELAPSED_MS * 3).clock.elapsedMs()).toBe(MAX_ELAPSED_MS)
  })
})
