import { z } from 'zod'
import { readStorage, removeStorage, writeStorage } from '../../lib/storage'

// Largura do calendário no computador, escolhida pela alça da borda.
export const MIN_WIDTH = 720
export const MAX_WIDTH = 1600
// Passo das setas na alça do calendário.
export const KEYBOARD_STEP = 40
export const LIBRARY_WIDTH_KEY = 'cruzadinha:library-width'

// A chave guarda só a largura escolhida, em px.
const libraryWidthSchema = z.object({ width: z.number().int().min(MIN_WIDTH).max(MAX_WIDTH) })

// O calendário fica centralizado: a borda anda metade do que ele cresce, então o deslocamento conta
// em dobro para a alça acompanhar o ponteiro.
export function widthFromDrag({ startWidth, dx }: { startWidth: number; dx: number }): number {
  return Math.round(startWidth + 2 * dx)
}

// Entre 720 e o menor entre 1600 e o espaço disponível; numa janela mais estreita que o mínimo, o
// espaço disponível manda, para não haver rolagem horizontal.
export function clampWidth(value: number, available: number): number {
  const max = Math.min(MAX_WIDTH, available)
  if (max < MIN_WIDTH) return Math.max(0, Math.round(max))
  return Math.round(Math.min(max, Math.max(MIN_WIDTH, value)))
}

export function loadLibraryWidth(): number | null {
  const raw = readStorage(LIBRARY_WIDTH_KEY)
  if (raw === null) return null
  try {
    const parsed = libraryWidthSchema.safeParse(JSON.parse(raw) as unknown)
    return parsed.success ? parsed.data.width : null
  } catch {
    return null
  }
}

export function saveLibraryWidth(width: number): void {
  writeStorage(LIBRARY_WIDTH_KEY, JSON.stringify({ width }))
}

export function clearLibraryWidth(): void {
  removeStorage(LIBRARY_WIDTH_KEY)
}
