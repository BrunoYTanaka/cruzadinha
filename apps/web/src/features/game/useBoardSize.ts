import { useState, type RefObject } from 'react'
import {
  clearBoardSize,
  fitCellSize,
  loadBoardSize,
  maxCellSize,
  resolveCellSize,
  saveBoardSize,
} from './board-size'
import { useMeasuredSpace } from './useMeasuredSpace'

type Options = { cols: number; rows: number; enabled: boolean }

export type BoardSize = {
  cellSize: number
  fit: number
  max: number
  isDefault: boolean
  // Durante o arraste: muda o tamanho sem guardar.
  preview: (cellSize: number) => void
  // Ao soltar ou a cada tecla: muda e guarda no aparelho.
  commit: (cellSize: number) => void
  // "Tamanho padrão": apaga a escolha.
  reset: () => void
}

// Tamanho da célula no layout de computador, a partir do espaço medido e da escolha guardada.
// `null` quando não há medida (celular, jsdom): a grade fica com o CSS da feature 010.
export function useBoardSize(
  ref: RefObject<HTMLElement | null>,
  { cols, rows, enabled }: Options,
): BoardSize | null {
  const space = useMeasuredSpace(ref, enabled)
  const [chosen, setChosen] = useState<number | null>(() => (enabled ? loadBoardSize() : null))
  // A escolha é lida de novo quando o layout de computador passa a valer (janela que abriu estreita
  // e foi alargada). Enquanto ele não vale, a escolha é ignorada, mas nunca apagada.
  const [wasEnabled, setWasEnabled] = useState(enabled)
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled)
    setChosen(enabled ? loadBoardSize() : null)
  }

  if (!enabled || !space) return null
  const fit = fitCellSize({ width: space.width, height: space.height, cols, rows })
  const max = maxCellSize({ width: space.width, cols })
  return {
    cellSize: resolveCellSize({ fit, max, chosen }),
    fit,
    max,
    isDefault: chosen === null,
    preview: setChosen,
    commit: (cellSize) => {
      setChosen(cellSize)
      saveBoardSize(cellSize)
    },
    reset: () => {
      setChosen(null)
      clearBoardSize()
    },
  }
}
