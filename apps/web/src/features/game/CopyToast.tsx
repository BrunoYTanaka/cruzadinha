import type { CopyNotice } from './useCopyClue'
import styles from './CopyToast.module.css'

const TEXT: Record<CopyNotice, string> = {
  copied: 'Dica copiada',
  failed: 'Não foi possível copiar',
}

// Aviso da cópia da dica (feature 032). Fica fora do fluxo, para não mover a barra nem o tabuleiro
// (feature 017). `role="status"` já é uma região viva educada; ela existe sempre e só o texto muda. Sem
// `aria-live` explícito, para não se confundir com a região viva da barra da dica.
export function CopyToast({ notice }: { notice: CopyNotice | null }) {
  return (
    <div className={styles.region} role="status">
      {notice ? <p className={styles.toast}>{TEXT[notice]}</p> : null}
    </div>
  )
}
