import type { Puzzle, Solution } from '@cruzadinha/shared'

// Mini cruzada 5x5 da landing (features 048 e 050: a amostra do mockup). Palavras e dicas inventadas para a página: nada vem de
// nenhuma fonte. `source`, `level` e `date` só existem porque o formato interno de puzzle os exige.
//
//   C O S T A
//   A # O # T
//   M U N D O
//   P # D # M
//   O C A S O
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
    {
      number: 1,
      direction: 'across',
      row: 0,
      col: 0,
      length: 5,
      clue: 'Faixa de terra junto ao mar',
    },
    { number: 4, direction: 'across', row: 2, col: 0, length: 5, clue: 'O planeta Terra' },
    { number: 5, direction: 'across', row: 4, col: 0, length: 5, clue: 'Pôr do sol' },
    {
      number: 1,
      direction: 'down',
      row: 0,
      col: 0,
      length: 5,
      clue: 'Terreno de futebol ou de plantação',
    },
    {
      number: 2,
      direction: 'down',
      row: 0,
      col: 2,
      length: 5,
      clue: 'Aparelho que mede a profundidade',
    },
    {
      number: 3,
      direction: 'down',
      row: 0,
      col: 4,
      length: 5,
      clue: 'Partícula de matéria (sem acento)',
    },
  ],
}

export const SAMPLE_SOLUTION: Solution = {
  cells: [
    ['C', 'O', 'S', 'T', 'A'],
    ['A', null, 'O', null, 'T'],
    ['M', 'U', 'N', 'D', 'O'],
    ['P', null, 'D', null, 'M'],
    ['O', 'C', 'A', 'S', 'O'],
  ],
}
