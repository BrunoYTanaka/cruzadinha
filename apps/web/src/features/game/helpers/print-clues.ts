import type { Word } from '@cruzadinha/shared'

// Dicas da folha de impressão (feature 055): só a parte pública do puzzle, por direção e em ordem
// de número.
export function printClues(words: readonly Word[]): { across: Word[]; down: Word[] } {
  const byNumber = (a: Word, b: Word) => a.number - b.number
  return {
    across: words.filter((word) => word.direction === 'across').sort(byNumber),
    down: words.filter((word) => word.direction === 'down').sort(byNumber),
  }
}

// Data longa com o ano, para a folha ("30 de outubro de 2026"); `formatDate` não traz o ano.
export function printDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)),
  )
}
