// Só entram A a Z e "Ç". Letras acentuadas viram a letra simples (á → A, ã → A, é → E);
// o cedilha é uma letra do alfabeto das cruzadas em português e fica como está.
export function normalizeLetter(input: string): string | null {
  if (Array.from(input).length !== 1) return null
  const upper = input.toLocaleUpperCase('pt-BR')
  if (upper === 'Ç') return 'Ç'
  const plain = upper.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return /^[A-Z]$/.test(plain) ? plain : null
}

// A solução da fonte traz letras acentuadas (Ã, É...). O jogador só digita A–Z e Ç, então a
// comparação e as ajudas usam a letra simples da solução.
export function plainLetter(letter: string): string {
  return normalizeLetter(letter) ?? letter
}
