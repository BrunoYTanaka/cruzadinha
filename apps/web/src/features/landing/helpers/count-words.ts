const FEMININE = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']

// Quantidade por extenso (feminino, para "fontes") de 1 a 9; acima disso, o número.
export function feminineCount(count: number): string {
  return FEMININE[count] && count > 0 ? (FEMININE[count] as string) : String(count)
}
