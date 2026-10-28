import { LandingContent } from '../features/landing'
import { HeaderStart } from './HeaderStart'
import styles from './AppLayout.module.css'

// Casca estática só para o HTML pré-gerado da landing (feature 048): o mesmo começo do cabeçalho e
// o mesmo `main` do AppLayout, para o conteúdo não se mover quando o React monta. As ações da
// direita (sessão, ajustes) entram depois, sem mexer no `main`.
export function LandingShell() {
  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <HeaderStart />
      </header>
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <LandingContent />
      </main>
    </div>
  )
}
