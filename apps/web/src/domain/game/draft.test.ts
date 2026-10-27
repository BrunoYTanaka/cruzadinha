import { describe, expect, it } from 'vitest'
import { TINY, makePuzzle, makeSolution } from '../../test/fixtures'
import { hasAnyDraft, pruneDraft, wordHasDraft } from './draft'
import { createGame } from './reducer'

const game = createGame({
  puzzle: makePuzzle(TINY),
  solution: makeSolution(TINY),
  limits: { letters: 4, words: 2 },
})
const empty = game.initialState

describe('rascunho puro', () => {
  it('hasAnyDraft', () => {
    expect(hasAnyDraft(empty.draft)).toBe(false)
    expect(hasAnyDraft([[null, 'A']])).toBe(true)
  })

  it('pruneDraft devolve o mesmo estado quando nada muda', () => {
    expect(pruneDraft(empty)).toBe(empty)
  })

  it('pruneDraft remove rascunho de casa preenchida, travada e em modo leitura', () => {
    const draft = [
      ['A', 'B', 'C'],
      [null, null, null],
      [null, null, null],
    ]
    const filled = { ...empty, draft, cells: [['X', null, null], ...empty.cells.slice(1)] }
    expect(pruneDraft(filled).draft[0]).toEqual([null, 'B', 'C'])
    const locked = { ...empty, draft, locked: [[false, true, false], ...empty.locked.slice(1)] }
    expect(pruneDraft(locked).draft[0]).toEqual(['A', null, 'C'])
    expect(hasAnyDraft(pruneDraft({ ...empty, draft, mode: 'completed' }).draft)).toBe(false)
  })

  it('wordHasDraft olha só a palavra ativa', () => {
    const draft = [
      [null, null, null],
      ['A', null, null],
      [null, null, null],
    ]
    expect(wordHasDraft(game.index, { ...empty, draft })).toBe(false)
    expect(
      wordHasDraft(game.index, {
        ...empty,
        draft,
        selected: { row: 1, col: 0 },
        direction: 'down',
      }),
    ).toBe(true)
  })
})
