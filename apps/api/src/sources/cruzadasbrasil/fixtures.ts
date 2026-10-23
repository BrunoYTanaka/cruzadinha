import { readFileSync } from 'node:fs'

// Lê uma fixture reduzida (5 x 5, conteúdo inventado). Só testes e seed importam este arquivo.
export function readFixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
}
