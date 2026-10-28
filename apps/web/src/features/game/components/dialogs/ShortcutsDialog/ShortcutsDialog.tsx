import { Dialog } from '../../../../../shared/components/Dialog/Dialog'
import { VisuallyHidden } from '../../../../../shared/components/VisuallyHidden/VisuallyHidden'
import { SHORTCUT_GROUPS } from '../../../helpers/shortcuts'
import styles from './ShortcutsDialog.module.css'

type ShortcutsDialogProps = { open: boolean; onClose: () => void }

// Lista os atalhos do tabuleiro (feature 046), lidos da mesma tabela que o `Board` usa.
export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Atalhos de teclado"
      closeButton
      closeOnBackdrop
      size="wide"
    >
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.title} className={styles.group}>
          <h3 className={styles.heading}>{group.title}</h3>
          <dl className={styles.list}>
            {group.shortcuts.map((shortcut) => (
              <div key={shortcut.action} className={styles.row}>
                <dt className={styles.keys}>
                  {shortcut.keys.map((item) => (
                    <kbd key={item.label} className={styles.key}>
                      {item.spoken ? (
                        <>
                          <span aria-hidden="true">{item.label}</span>
                          <VisuallyHidden>{item.spoken}</VisuallyHidden>
                        </>
                      ) : (
                        item.label
                      )}
                    </kbd>
                  ))}
                </dt>
                <dd className={styles.description}>{shortcut.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  )
}
