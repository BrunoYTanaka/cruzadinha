// Texto sem acentos e em maiúsculas, para comparar respostas e termos (feature 064). Mesma regra do
// `plainLetter` do site, que a API não pode importar (web e api nunca importam um do outro).
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleUpperCase('pt-BR')
}

// Palavras de um texto, já sem acento: só letras, separadas por qualquer outro caractere.
export function plainWords(text: string): string[] {
  return plain(text)
    .split(/[^A-Z]+/)
    .filter(Boolean)
}
