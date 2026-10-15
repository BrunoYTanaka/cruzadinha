import styles from './BoardSizeReset.module.css'

// "Tamanho padrão" na faixa de ferramentas do computador: apaga o tamanho escolhido pela alça.
export function BoardSizeReset({
  isDefault,
  onReset,
}: {
  isDefault: boolean
  onReset: () => void
}) {
  return (
    <button type="button" className={styles.reset} disabled={isDefault} onClick={onReset}>
      Tamanho padrão
    </button>
  )
}
