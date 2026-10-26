import { getSettings, updateSettings } from '../../../shared/services/settings-store'

// Tamanho da célula do tabuleiro no computador. Regra de layout, não de jogo: fica fora do
// `game-logic`, em funções puras testadas sem navegador.

export const MIN_CELL = 30
export const MAX_CELL = 110
// Passo das setas na alça do tabuleiro.
export const KEYBOARD_STEP = 10

function clampCell(value: number): number {
  return Math.min(MAX_CELL, Math.max(MIN_CELL, value))
}

// Maior célula inteira que cabe no espaço: a grade tem `count` células, 1 px de `gap` entre elas e
// 2 px de `padding` de cada lado (`Board.module.css`).
export function cellFor(space: number, count: number): number {
  return Math.max(0, Math.floor((space - (count - 1) - 4) / count))
}

// Padrão: o maior tamanho com o tabuleiro inteiro na largura e na altura disponíveis.
export function fitCellSize(space: {
  width: number
  height: number
  cols: number
  rows: number
}): number {
  return clampCell(Math.min(cellFor(space.width, space.cols), cellFor(space.height, space.rows)))
}

// Limite pela largura: acima dele a página rolaria na horizontal.
export function maxCellSize(space: { width: number; cols: number }): number {
  return clampCell(cellFor(space.width, space.cols))
}

// Sem escolha vale o padrão; uma escolha que não cabe usa o maior tamanho que cabe, sem mudar o que
// está guardado.
export function resolveCellSize({
  fit,
  max,
  chosen,
}: {
  fit: number
  max: number
  chosen: number | null
}): number {
  if (chosen === null) return fit
  return Math.min(max, Math.max(MIN_CELL, chosen))
}

// Arraste da alça no canto do tabuleiro. O bloco é centralizado, então o canto anda metade do que
// a grade cresce na largura: o deslocamento horizontal conta em dobro. Vale o eixo em que a pessoa
// mexeu mais.
export function cellFromDrag({
  startCell,
  dx,
  dy,
  cols,
  rows,
}: {
  startCell: number
  dx: number
  dy: number
  cols: number
  rows: number
}): number {
  const horizontal = (2 * dx) / cols
  const vertical = dy / rows
  const change = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical
  return Math.round(startCell + change)
}

// Escolha guardada nas configurações (feature 021); `null` é o tamanho que cabe.
export function loadBoardSize(): number | null {
  return getSettings().boardCellSize
}

export function saveBoardSize(cellSize: number): void {
  updateSettings({ boardCellSize: Math.min(MAX_CELL, Math.max(MIN_CELL, Math.round(cellSize))) })
}

export function clearBoardSize(): void {
  updateSettings({ boardCellSize: null })
}
