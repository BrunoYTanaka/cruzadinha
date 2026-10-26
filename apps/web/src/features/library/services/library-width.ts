import { getSettings, updateSettings } from '../../../shared/services/settings-store'

// Largura do calendário no computador, escolhida pela alça da borda.
export const MIN_WIDTH = 720
export const MAX_WIDTH = 1600
// Passo das setas na alça do calendário.
export const KEYBOARD_STEP = 40

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

// Escolha guardada nas configurações (feature 021); `null` é o ajuste automático.
export function loadLibraryWidth(): number | null {
  return getSettings().libraryWidth
}

export function saveLibraryWidth(width: number): void {
  updateSettings({ libraryWidth: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width))) })
}

export function clearLibraryWidth(): void {
  updateSettings({ libraryWidth: null })
}
