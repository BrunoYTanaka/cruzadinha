import { Notice } from '../../../../shared/components/Notice/Notice'
import { useOnline } from '../../../../shared/hooks/useOnline/useOnline'
import styles from './OfflineNotice.module.css'

// Aviso discreto de que não há rede; o jogo segue com o que está guardado (feature 041, FR-004).
export function OfflineNotice() {
  return useOnline() ? null : (
    <div className={styles.wrap}>
      <Notice>Sem conexão. O que já está guardado neste aparelho continua disponível.</Notice>
    </div>
  )
}
