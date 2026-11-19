// Feature 065: desenho das casas pretas (research R6). Grade N x N simétrica por meia volta, com
// toda corrida de brancas de 3 a `maxSlot` letras e as brancas ligadas.

export type Template = { size: number; black: boolean[][] }
export type SlotDirection = 'across' | 'down'
export type Slot = {
  direction: SlotDirection
  row: number
  col: number
  length: number
  cells: [number, number][]
}

const MIN_SLOT = 3

/** Corridas de brancas (de qualquer comprimento) de uma direção. */
function runs(black: boolean[][], direction: SlotDirection, minLength = 1): Slot[] {
  const size = black.length
  const result: Slot[] = []
  for (let a = 0; a < size; a++) {
    let cells: [number, number][] = []
    const flush = () => {
      if (cells.length >= minLength) {
        const [row, col] = cells[0]!
        result.push({ direction, row, col, length: cells.length, cells })
      }
      cells = []
    }
    for (let b = 0; b < size; b++) {
      const [r, c] = direction === 'across' ? [a, b] : [b, a]
      if (black[r]![c]) flush()
      else cells.push([r, c])
    }
    flush()
  }
  return result
}

export function slotsOf(template: Template): Slot[] {
  return [...runs(template.black, 'across', MIN_SLOT), ...runs(template.black, 'down', MIN_SLOT)]
}

function connected(black: boolean[][]): boolean {
  const size = black.length
  let total = 0
  let start: [number, number] | null = null
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!black[r]![c]) {
        total++
        start ??= [r, c]
      }
    }
  }
  if (!start) return false
  const seen = new Set<number>([start[0] * size + start[1]])
  const stack = [start]
  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    for (const [nr, nc] of [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ] as const) {
      if (black[nr]?.[nc] === false && !seen.has(nr * size + nc)) {
        seen.add(nr * size + nc)
        stack.push([nr, nc])
      }
    }
  }
  return seen.size === total
}

function attempt(size: number, random: () => number, maxSlot: number, maxBlack: number) {
  const black = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const target = Math.min(maxBlack, Math.round(size * size * (0.19 + random() * 0.06)))
  let count = 0
  const toggle = (r: number, c: number, value: boolean) => {
    for (const [pr, pc] of [
      [r, c],
      [size - 1 - r, size - 1 - c],
    ] as const) {
      black[pr]![pc] = value
    }
  }
  const tooShort = () =>
    runs(black, 'across').some((s) => s.length < MIN_SLOT) ||
    runs(black, 'down').some((s) => s.length < MIN_SLOT)
  for (let tries = 0; tries < 400; tries++) {
    const long = [...runs(black, 'across'), ...runs(black, 'down')].filter(
      (s) => s.length > maxSlot,
    )
    if (count >= target && long.length === 0) return black
    if (count >= maxBlack) return null
    // Quebra de preferência uma corrida longa demais; sem nenhuma, qualquer casa branca.
    const pool =
      long.length > 0
        ? long[Math.floor(random() * long.length)]!.cells
        : black.flatMap((line, r) =>
            line.flatMap((b, c) => (b ? [] : [[r, c] as [number, number]])),
          )
    const [r, c] = pool[Math.floor(random() * pool.length)]!
    if (black[r]![c]) continue
    toggle(r, c, true)
    const added = r === size - 1 - r && c === size - 1 - c ? 1 : 2
    if (count + added > maxBlack || tooShort() || !connected(black)) toggle(r, c, false)
    else count += added
  }
  return null
}

/** Desenho simétrico válido, ou `null` se 2000 tentativas não chegarem a um. */
export function makeTemplate(
  size: number,
  random: () => number,
  options: { maxSlot: number; maxBlackRatio?: number },
): Template | null {
  const maxBlack = Math.floor(size * size * (options.maxBlackRatio ?? 0.25))
  for (let i = 0; i < 2000; i++) {
    const black = attempt(size, random, options.maxSlot, maxBlack)
    if (black) return { size, black }
  }
  return null
}
