import { describe, expect, it } from 'vitest'
import { decideReset, decideSave, type ProgressState } from './progress.service'

const now = new Date('2026-10-13T14:00:00.000Z')
const empty = [
  [null, null],
  [null, null],
]
const letters = [
  ['A', null],
  [null, 'D'],
]
const other = [
  ['B', null],
  [null, 'D'],
]

const fresh: ProgressState = {
  cells: empty,
  elapsedMs: 0,
  status: 'in_progress',
  savedAt: new Date(0),
  completedAt: null,
  finishedMs: null,
  bestMs: null,
  bestAt: null,
}

const request = (overrides: Partial<Parameters<typeof decideSave>[1]> = {}) => ({
  cells: letters,
  elapsedMs: 83_000,
  status: 'in_progress' as const,
  savedAt: '2026-10-13T13:59:00.000Z',
  ...overrides,
})

const completed: ProgressState = {
  cells: letters,
  elapsedMs: 83_000,
  status: 'completed',
  savedAt: new Date('2026-10-13T13:00:00.000Z'),
  completedAt: new Date('2026-10-13T13:00:01.000Z'),
  finishedMs: 83_000,
  bestMs: 79_000,
  bestAt: new Date('2026-10-12T09:15:40.000Z'),
}

function applied(decision: ReturnType<typeof decideSave>): ProgressState {
  if (decision.kind !== 'apply') throw new Error(`esperava apply, veio ${decision.kind}`)
  return decision.next
}

describe('decideSave', () => {
  it('aplica letras, tempo e savedAt do pedido sobre uma linha vazia', () => {
    const next = applied(decideSave(fresh, request(), now))
    expect(next).toMatchObject({
      cells: letters,
      elapsedMs: 83_000,
      status: 'in_progress',
      savedAt: new Date('2026-10-13T13:59:00.000Z'),
      completedAt: null,
      finishedMs: null,
      bestMs: null,
      bestAt: null,
    })
  })

  it('usa letras e tempo do pedido, nunca do estado anterior', () => {
    const current = {
      ...fresh,
      cells: other,
      elapsedMs: 5_000,
      savedAt: new Date('2026-10-13T13:00:00Z'),
    }
    const next = applied(decideSave(current, request(), now))
    expect(next.cells).toEqual(letters)
    expect(next.elapsedMs).toBe(83_000)
  })

  it('ignora um salvamento mais antigo que o guardado', () => {
    const current = { ...fresh, savedAt: new Date('2026-10-13T13:59:30.000Z') }
    expect(decideSave(current, request(), now)).toEqual({ kind: 'unchanged' })
  })

  it('aplica um salvamento com o mesmo savedAt', () => {
    const current = { ...fresh, savedAt: new Date('2026-10-13T13:59:00.000Z') }
    expect(decideSave(current, request(), now).kind).toBe('apply')
  })

  it('recusa savedAt mais de 5 minutos à frente do servidor', () => {
    const decision = decideSave(fresh, request({ savedAt: '2026-10-13T14:05:01.000Z' }), now)
    expect(decision).toEqual({ kind: 'invalid-saved-at' })
    expect(decideSave(fresh, request({ savedAt: '2026-10-13T14:05:00.000Z' }), now).kind).toBe(
      'apply',
    )
  })

  describe('conclusão', () => {
    const complete = request({ status: 'completed', elapsedMs: 90_000 })

    it('define tempo de término, momento e primeiro recorde', () => {
      const next = applied(decideSave(fresh, complete, now))
      expect(next).toMatchObject({
        status: 'completed',
        completedAt: now,
        finishedMs: 90_000,
        bestMs: 90_000,
        bestAt: now,
      })
    })

    it('mantém o recorde quando o tempo é pior ou empata', () => {
      const current = { ...fresh, bestMs: 79_000, bestAt: completed.bestAt }
      for (const elapsedMs of [90_000, 79_000]) {
        const next = applied(decideSave(current, request({ status: 'completed', elapsedMs }), now))
        expect(next.bestMs).toBe(79_000)
        expect(next.bestAt).toEqual(completed.bestAt)
        expect(next.finishedMs).toBe(elapsedMs)
      }
    })

    it('troca o recorde com tempo estritamente menor', () => {
      const current = { ...fresh, bestMs: 79_000, bestAt: completed.bestAt }
      const next = applied(
        decideSave(current, request({ status: 'completed', elapsedMs: 70_000 }), now),
      )
      expect(next.bestMs).toBe(70_000)
      expect(next.bestAt).toEqual(now)
    })

    it('é idempotente sobre um registro concluído com as mesmas letras', () => {
      const repeat = request({ status: 'completed', cells: letters, elapsedMs: 83_000 })
      expect(decideSave(completed, repeat, now)).toEqual({ kind: 'unchanged' })
    })

    it('recusa voltar a em andamento ou alterar letras de um concluído', () => {
      expect(decideSave(completed, request(), now)).toEqual({ kind: 'progress-completed' })
      const changed = request({ status: 'completed', cells: other })
      expect(decideSave(completed, changed, now)).toEqual({ kind: 'progress-completed' })
    })

    it('ignora salvamento atrasado mesmo sobre um concluído', () => {
      const stale = request({ savedAt: '2026-10-13T12:00:00.000Z' })
      expect(decideSave(completed, stale, now)).toEqual({ kind: 'unchanged' })
    })
  })
})

describe('decideReset', () => {
  it('zera letras e tempo, limpa a conclusão e mantém o recorde', () => {
    const next = decideReset(completed, empty, now)
    expect(next).toEqual({
      cells: empty,
      elapsedMs: 0,
      status: 'in_progress',
      savedAt: now,
      completedAt: null,
      finishedMs: null,
      bestMs: 79_000,
      bestAt: completed.bestAt,
    })
  })

  it('não recua o savedAt quando ele está à frente do servidor', () => {
    const ahead = new Date('2026-10-13T14:03:00.000Z')
    expect(decideReset({ ...completed, savedAt: ahead }, empty, now).savedAt).toEqual(ahead)
  })
})
