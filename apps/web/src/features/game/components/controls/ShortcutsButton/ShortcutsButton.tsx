import { buttonClass } from '../../../../../shared/components/Button/Button'
import { Tooltip } from '../../../../../shared/components/Tooltip/Tooltip'
import styles from '../Toolbar/Toolbar.module.css'

// Teclado na faixa de ferramentas (feature 046): abre a lista de atalhos.
export function ShortcutsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Tooltip label="Atalhos de teclado">
      <button
        type="button"
        className={`${buttonClass({ variant: 'icon' })} ${styles.iconButton}`}
        aria-label="Atalhos de teclado"
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
        </svg>
      </button>
    </Tooltip>
  )
}
