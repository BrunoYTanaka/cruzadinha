import { describe, expect, it } from 'vitest'
import { cellsFrom, LAYOUT5, makePuzzle, TINY } from '../../test/fixtures'
import {
  activeWord,
  arrowDirection,
  buildIndex,
  directionAt,
  entryCell,
  findWord,
  moveBy,
  nextCellInWord,
  previousCellInWord,
  stepWord,
} from './navigation'

const index = buildIndex(makePuzzle(LAYOUT5))

describe('palavra ativa', () => {
  it('acha a palavra de uma célula em cada direção', () => {
    expect(index.wordAt({ row: 1, col: 1 }, 'across')).toMatchObject({
      number: 4,
      direction: 'across',
    })
    expect(index.wordAt({ row: 1, col: 1 }, 'down')).toMatchObject({ number: 1, direction: 'down' })
    expect(index.wordAt({ row: 0, col: 0 }, 'across')).toBeNull()
  })

  it('mantém a direção se há palavra e troca para a outra se não há', () => {
    // (0,2) só está numa palavra horizontal (CASA)
    expect(directionAt(index, { row: 0, col: 2 }, 'down')).toBe('across')
    // (4,0) só está numa palavra vertical (MARE)
    expect(directionAt(index, { row: 4, col: 0 }, 'across')).toBe('down')
    // (1,1) tem as duas
    expect(directionAt(index, { row: 1, col: 1 }, 'down')).toBe('down')
  })

  it('devolve a palavra ativa pela posição e direção', () => {
    expect(activeWord(index, { row: 2, col: 3 }, 'across')?.number).toBe(6)
    expect(activeWord(index, null, 'across')).toBeNull()
  })
})

describe('próxima célula da palavra', () => {
  it('anda dentro da palavra e para no fim', () => {
    expect(nextCellInWord(index, { row: 0, col: 1 }, 'across')).toEqual({ row: 0, col: 2 })
    expect(nextCellInWord(index, { row: 0, col: 4 }, 'across')).toBeNull()
    expect(previousCellInWord(index, { row: 0, col: 2 }, 'across')).toEqual({ row: 0, col: 1 })
    expect(previousCellInWord(index, { row: 0, col: 1 }, 'across')).toBeNull()
  })

  it('anda na vertical quando a direção é down', () => {
    expect(nextCellInWord(index, { row: 1, col: 0 }, 'down')).toEqual({ row: 2, col: 0 })
    expect(nextCellInWord(index, { row: 4, col: 0 }, 'down')).toBeNull()
  })
})

describe('setas', () => {
  it('pula blocos e vai à próxima célula aberta', () => {
    expect(moveBy(index, { row: 1, col: 1 }, 'ArrowRight')).toEqual({ row: 1, col: 3 })
    expect(moveBy(index, { row: 0, col: 2 }, 'ArrowDown')).toEqual({ row: 2, col: 2 })
    expect(moveBy(index, { row: 2, col: 2 }, 'ArrowUp')).toEqual({ row: 0, col: 2 })
  })

  it('não se move no limite da grade', () => {
    expect(moveBy(index, { row: 0, col: 4 }, 'ArrowRight')).toBeNull()
    expect(moveBy(index, { row: 0, col: 1 }, 'ArrowUp')).toBeNull()
    expect(moveBy(index, { row: 0, col: 1 }, 'ArrowLeft')).toBeNull()
    expect(moveBy(index, { row: 4, col: 0 }, 'ArrowDown')).toBeNull()
  })

  it('setas horizontais pedem a direção horizontal e as verticais, a vertical', () => {
    expect(arrowDirection('ArrowLeft')).toBe('across')
    expect(arrowDirection('ArrowRight')).toBe('across')
    expect(arrowDirection('ArrowUp')).toBe('down')
    expect(arrowDirection('ArrowDown')).toBe('down')
  })
})

describe('Tab e Shift+Tab entre palavras', () => {
  it('segue horizontais e depois verticais, em ordem de número', () => {
    const order = index.words.map(
      (word) => `${word.number}${word.direction === 'across' ? 'H' : 'V'}`,
    )
    expect(order).toEqual(['1H', '4H', '5H', '6H', '7H', '8H', '9H', '1V', '2V', '3V', '4V'])
  })

  it('dá a volta nas pontas', () => {
    const last = findWord(index, 4, 'down')
    const first = findWord(index, 1, 'across')
    expect(stepWord(index, last, 1)).toMatchObject({ number: 1, direction: 'across' })
    expect(stepWord(index, first, -1)).toMatchObject({ number: 4, direction: 'down' })
    expect(stepWord(index, findWord(index, 9, 'across'), 1)).toMatchObject({
      number: 1,
      direction: 'down',
    })
  })

  it('sem palavra ativa começa na primeira ou na última', () => {
    expect(stepWord(index, null, 1)).toMatchObject({ number: 1, direction: 'across' })
    expect(stepWord(index, null, -1)).toMatchObject({ number: 4, direction: 'down' })
  })
})

describe('seleção por dica', () => {
  it('encontra a palavra por número e direção', () => {
    expect(findWord(index, 6, 'across')).toMatchObject({ row: 2, col: 0, length: 5 })
    expect(findWord(index, 6, 'down')).toBeNull()
  })

  it('cai na primeira célula vazia ou, se a palavra está cheia, na primeira', () => {
    const word = findWord(index, 6, 'across')!
    expect(
      entryCell(index, word, cellsFrom(['.....', '.....', '.....', '.....', '.....'])),
    ).toEqual({
      row: 2,
      col: 0,
    })
    expect(
      entryCell(index, word, cellsFrom(['.....', '.....', 'AR...', '.....', '.....'])),
    ).toEqual({
      row: 2,
      col: 2,
    })
    expect(
      entryCell(index, word, cellsFrom(['.....', '.....', 'ARTES', '.....', '.....'])),
    ).toEqual({
      row: 2,
      col: 0,
    })
  })
})

describe('grade pequena', () => {
  it('funciona numa 3 × 3', () => {
    const tiny = buildIndex(makePuzzle(TINY))
    expect(tiny.words.map((word) => word.number)).toEqual([1, 3, 1, 2])
    expect(moveBy(tiny, { row: 0, col: 0 }, 'ArrowDown')).toEqual({ row: 1, col: 0 })
    expect(moveBy(tiny, { row: 1, col: 0 }, 'ArrowRight')).toEqual({ row: 1, col: 2 })
  })
})
