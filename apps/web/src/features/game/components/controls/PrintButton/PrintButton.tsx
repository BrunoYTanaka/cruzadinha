import { buttonClass } from '../../../../../shared/components/Button/Button'
import { Tooltip } from '../../../../../shared/components/Tooltip/Tooltip'
import styles from '../Toolbar/Toolbar.module.css'

// Imprimir a cruzada em branco (feature 054): abre a impressão do navegador.
export function PrintButton({ onPrint }: { onPrint: () => void }) {
  return (
    <Tooltip label="Imprimir">
      <button
        type="button"
        className={`${buttonClass({ variant: 'icon' })} ${styles.iconButton}`}
        aria-label="Imprimir"
        onClick={onPrint}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
          <rect x="7" y="14" width="10" height="6" />
        </svg>
      </button>
    </Tooltip>
  )
}
