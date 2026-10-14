import type { Puzzle } from '@cruzadinha/shared'

export type Direction = 'across' | 'down'
export type Position = { row: number; col: number }
// roxo (ajuda usada) | vermelho (errada na verificação)
export type HelpMark = 'helped' | 'wrong'
export type HelpResult = {
  seq: number
  kind: 'letter' | 'word' | 'verify' | 'letter-limit' | 'word-limit' | 'nothing'
  // verify: letras erradas encontradas; word: células reveladas.
  count: number
}
export type GameLimits = { letters: number; words: number }

export type GameState = {
  // Letras do jogador: mesmas dimensões da grade; maiúsculas A–Z e Ç; `null` em bloco ou vazia.
  cells: (string | null)[][]
  // Nunca aponta para bloco. `null` em modo leitura.
  selected: Position | null
  direction: Direction
  // Células reveladas por ajuda (não editáveis).
  locked: boolean[][]
  // Chave "linha,coluna"; só células afetadas por ajuda.
  marks: Record<string, HelpMark>
  usage: { letters: number; words: number }
  // Resultado da última ajuda, para anunciar a leitores de tela; `seq` muda a cada ajuda.
  lastHelp: HelpResult | null
  mode: 'playing' | 'completed' // completed = modo leitura
  // pending = concluída aqui, ainda sem confirmação do servidor; só `confirmed` mostra o melhor
  // tempo.
  completion: 'none' | 'pending' | 'confirmed'
  // O servidor avisou que outro aparelho concluiu. Só avisa: não bloqueia a edição.
  elsewhere: boolean
}

export function cellKey(position: Position): string {
  return `${position.row},${position.col}`
}

export function emptyCells(puzzle: Puzzle): (string | null)[][] {
  return puzzle.grid.cells.map((row) => row.map(() => null))
}

export function emptyLocks(puzzle: Puzzle): boolean[][] {
  return puzzle.grid.cells.map((row) => row.map(() => false))
}

// A seleção começa na primeira palavra horizontal (ou, sem ela, na primeira palavra).
export function initialSelection(puzzle: Puzzle): {
  selected: Position | null
  direction: Direction
} {
  const across = puzzle.words.filter((word) => word.direction === 'across')
  const first = [...across, ...puzzle.words].sort((a, b) => a.number - b.number)[0]
  const firstAcross = across.sort((a, b) => a.number - b.number)[0]
  const word = firstAcross ?? first
  return word
    ? { selected: { row: word.row, col: word.col }, direction: word.direction }
    : { selected: null, direction: 'across' }
}

export function createInitialState(puzzle: Puzzle): GameState {
  const { selected, direction } = initialSelection(puzzle)
  return {
    cells: emptyCells(puzzle),
    selected,
    direction,
    locked: emptyLocks(puzzle),
    marks: {},
    usage: { letters: 0, words: 0 },
    lastHelp: null,
    mode: 'playing',
    completion: 'none',
    elsewhere: false,
  }
}
