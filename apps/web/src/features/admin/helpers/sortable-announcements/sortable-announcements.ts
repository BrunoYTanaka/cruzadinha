// Textos da ordenação das fontes em português (feature 062). Puros, para o teste e para o leitor
// de tela: a posição é sempre "N de M".
export const SORT_INSTRUCTIONS =
  'Para mudar a ordem sem arrastar: Espaço pega a fonte, as setas para cima e para baixo a movem, ' +
  'Espaço solta e Esc cancela.'

const where = (position: number, total: number) => `posição ${position} de ${total}`

export function announceGrabbed(name: string, position: number, total: number): string {
  return `${name} pega, ${where(position, total)}. Use as setas para mover, Espaço para soltar, Esc para cancelar.`
}

export function announceMoved(name: string, position: number, total: number): string {
  return `${name} na ${where(position, total)}.`
}

export function announceDropped(name: string, position: number, total: number): string {
  return `${name} solta na ${where(position, total)}.`
}

export function announceCanceled(name: string, position: number, total: number): string {
  return `Movimento cancelado. ${name} voltou à ${where(position, total)}.`
}

// Mover a linha `from` uma casa para cima (-1) ou para baixo (+1); a mesma lista se não couber.
export function moveBy<T>(items: readonly T[], from: number, by: -1 | 1): T[] {
  const to = from + by
  const item = items[from]
  if (item === undefined || to < 0 || to >= items.length) return [...items]
  const next = [...items]
  next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
