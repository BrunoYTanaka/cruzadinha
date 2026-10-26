import { afterEach, describe, expect, it } from 'vitest'
import { ApiRequestError } from '../../shared/services/api/client'
import {
  clearSourceDown,
  isNoPuzzle,
  isSourceDown,
  isSourceUnsupported,
  markNoPuzzle,
  markSourceDown,
  readNoPuzzleDates,
  SOURCE_DOWN_TTL_MS,
} from './source-down'

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('aviso de fonte fora do ar', () => {
  it('vale só para a fonte marcada', () => {
    markSourceDown('cruzadaonline', 1_000)
    expect(isSourceDown('cruzadaonline', 2_000)).toBe(true)
    expect(isSourceDown('oglobo', 2_000)).toBe(false)
  })

  it('dura 10 minutos e some ao limpar', () => {
    markSourceDown('oglobo', 0)
    expect(isSourceDown('oglobo', SOURCE_DOWN_TTL_MS - 1)).toBe(true)
    expect(isSourceDown('oglobo', SOURCE_DOWN_TTL_MS)).toBe(false)
    clearSourceDown('oglobo')
    expect(isSourceDown('oglobo', 1)).toBe(false)
  })

  it('ignora a chave antiga, de antes das fontes', () => {
    window.localStorage.setItem('cruzadinha:source-down', String(Date.now()))
    expect(isSourceDown('oglobo')).toBe(false)
  })
})

describe('dia sem cruzada', () => {
  it('é lembrado por fonte', () => {
    markNoPuzzle('cruzadaonline', '2026-10-03')
    expect(isNoPuzzle('cruzadaonline', '2026-10-03')).toBe(true)
    expect(isNoPuzzle('oglobo', '2026-10-03')).toBe(false)
    expect(readNoPuzzleDates('cruzadaonline', ['2026-10-02', '2026-10-03'])).toEqual(
      new Set(['2026-10-03']),
    )
  })

  it('uma fonte sem busca por data nunca é buscável: todo dia passado é sem cruzada (feature 030)', () => {
    expect(isNoPuzzle('clube', '2026-10-03')).toBe(true)
    expect(readNoPuzzleDates('clube', ['2026-10-02', '2026-10-03'])).toEqual(
      new Set(['2026-10-02', '2026-10-03']),
    )
    expect(isNoPuzzle('oglobo', '2026-10-03')).toBe(false)
  })
})

describe('fonte que a API não conhece (feature 030)', () => {
  it('só o 400 (invalid-input) conta como fonte indisponível', () => {
    expect(isSourceUnsupported(new ApiRequestError(400, { code: 'invalid-input' }))).toBe(true)
    expect(isSourceUnsupported(new ApiRequestError(502))).toBe(false)
    expect(isSourceUnsupported(new Error('x'))).toBe(false)
  })
})
