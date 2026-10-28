import type { Puzzle, Solution } from '@cruzadinha/shared'

// Mini cruzada 5x5 da landing (feature 048). Palavras e dicas inventadas para a página: nada vem de
// nenhuma fonte. `source`, `level` e `date` só existem porque o formato interno de puzzle os exige.
//
//   A I N D A
//   L # O # R
//   B A I L E
//   U # T # I
//   M O E D A
const open = (number: number | null = null) => ({ kind: 'open' as const, number })
const block = { kind: 'block' as const }

export const SAMPLE_PUZZLE: Puzzle = {
  source: 'oglobo',
  level: 'daily',
  date: '2026-01-01',
  attribution: { sourceName: 'Amostra da landing', title: null, author: null, copyright: null },
  grid: {
    width: 5,
    height: 5,
    cells: [
      [open(1), open(), open(2), open(), open(3)],
      [open(), block, open(), block, open()],
      [open(4), open(), open(), open(), open()],
      [open(), block, open(), block, open()],
      [open(5), open(), open(), open(), open()],
    ],
  },
  words: [
    { number: 1, direction: 'across', row: 0, col: 0, length: 5, clue: 'Até este momento' },
    { number: 4, direction: 'across', row: 2, col: 0, length: 5, clue: 'Festa com música e dança' },
    {
      number: 5,
      direction: 'across',
      row: 4,
      col: 0,
      length: 5,
      clue: 'Peça de metal que vale dinheiro',
    },
    { number: 1, direction: 'down', row: 0, col: 0, length: 5, clue: 'Livro para guardar fotos' },
    { number: 2, direction: 'down', row: 0, col: 2, length: 5, clue: 'Quando o céu escurece' },
    { number: 3, direction: 'down', row: 0, col: 4, length: 5, clue: 'Grãos finos da praia' },
  ],
}

export const SAMPLE_SOLUTION: Solution = {
  cells: [
    ['A', 'I', 'N', 'D', 'A'],
    ['L', null, 'O', null, 'R'],
    ['B', 'A', 'I', 'L', 'E'],
    ['U', null, 'T', null, 'I'],
    ['M', 'O', 'E', 'D', 'A'],
  ],
}
