import { buttonClass } from '../../../../../shared/components/Button/Button'
import { Tooltip } from '../../../../../shared/components/Tooltip/Tooltip'
import styles from '../../controls/Toolbar/Toolbar.module.css'

// "Tamanho padrão" na faixa de ferramentas do computador: apaga o tamanho escolhido pela alça. É um
// botão de ícone (quatro cantos) com o nome no balão, como os outros da faixa (feature 063).
export function BoardSizeReset({
  isDefault,
  onReset,
}: {
  isDefault: boolean
  onReset: () => void
}) {
  return (
    <Tooltip label="Tamanho padrão">
      <button
        type="button"
        className={`${buttonClass({ variant: 'icon' })} ${styles.iconButton}`}
        aria-label="Tamanho padrão"
        disabled={isDefault}
        onClick={onReset}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </Tooltip>
  )
}
