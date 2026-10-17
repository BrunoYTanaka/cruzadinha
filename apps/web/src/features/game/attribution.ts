import type { Puzzle } from '@cruzadinha/shared'

// Linha de atribuição: fonte, título, autor e direitos, sem repetir uma parte igual a outra já
// mostrada (a Cruzada Online usa o próprio nome nos direitos, feature 014).
export function attributionLine({ attribution }: Pick<Puzzle, 'attribution'>): string {
  const { sourceName, title, author, copyright } = attribution
  const parts = [sourceName, title, author, copyright].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  )
  return ['Fonte: ' + parts[0], ...parts.slice(1)].join(' · ')
}
