// Deslocamento horizontal (px) que mantém um balão dentro da janela (feature 024). `left` e `width`
// são a caixa do balão como está; devolve 0 quando já cabe, e um valor negativo ou positivo que o
// leva até a margem da borda que ele ultrapassa. Se ele é mais largo que a janela útil, alinha à
// esquerda (a leitura do início do texto vale mais que a do fim).
export function clampShift(left: number, width: number, viewport: number, margin = 8): number {
  if (left < margin) return margin - left
  const overflow = left + width - (viewport - margin)
  if (overflow <= 0) return 0
  // Não passa da margem esquerda ao empurrar para a esquerda.
  return -Math.min(overflow, left - margin)
}
