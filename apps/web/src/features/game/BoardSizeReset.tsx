import { Button } from '../../shared/components/Button'

// "Tamanho padrão" na faixa de ferramentas do computador: apaga o tamanho escolhido pela alça. É um
// botão secundário pequeno (feature 023), com o texto na cor normal, não na dos links.
export function BoardSizeReset({
  isDefault,
  onReset,
}: {
  isDefault: boolean
  onReset: () => void
}) {
  return (
    <Button size="small" disabled={isDefault} onClick={onReset}>
      Tamanho padrão
    </Button>
  )
}
