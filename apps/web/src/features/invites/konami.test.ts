import { describe, expect, it } from 'vitest'
import { createKonamiDetector, KONAMI } from './konami'

const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
  key,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...modifiers,
})

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

function run(keys: string[], detector = createKonamiDetector()) {
  return keys.map((key) => detector.push(press(key)))
}

describe('detector do Konami', () => {
  it('reconhece ↑ ↑ ↓ ↓ ← → ← → B A só na última tecla', () => {
    const results = run(SEQUENCE)
    expect(results.slice(0, -1).every((value) => !value)).toBe(true)
    expect(results.at(-1)).toBe(true)
    expect(KONAMI).toHaveLength(10)
  })

  it('aceita maiúsculas', () => {
    expect(run([...SEQUENCE.slice(0, 8), 'B', 'A']).at(-1)).toBe(true)
  })

  it('uma tecla errada reinicia', () => {
    expect(run([...SEQUENCE.slice(0, 5), 'x', ...SEQUENCE.slice(5)]).at(-1)).toBe(false)
    expect(run(['x', ...SEQUENCE]).at(-1)).toBe(true)
  })

  it('a tecla errada que começa a sequência conta como a primeira', () => {
    expect(run(['ArrowUp', 'ArrowUp', 'ArrowUp', ...SEQUENCE.slice(1)]).at(-1)).toBe(true)
  })

  it('ignora teclas com Ctrl, Alt ou Meta', () => {
    const detector = createKonamiDetector()
    const results = SEQUENCE.map((key, index) =>
      detector.push(press(key, index === 3 ? { ctrlKey: true } : {})),
    )
    // A tecla com Ctrl não conta nem reinicia: falta uma tecla para completar.
    expect(results.at(-1)).toBe(false)
    expect(detector.push(press('ArrowDown'))).toBe(false)
  })

  it('volta ao começo depois de completar', () => {
    const detector = createKonamiDetector()
    run(SEQUENCE, detector)
    expect(run(SEQUENCE, detector).at(-1)).toBe(true)
  })
})
