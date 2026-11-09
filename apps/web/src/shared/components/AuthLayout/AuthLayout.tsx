import type { ReactNode } from 'react'
import authStyles from '../AuthPage.module.css'
import styles from './AuthLayout.module.css'

type AuthLayoutProps = {
  headline: string
  lead: string
  // Palavras da cruzada de enfeite: maiúscula é casa preenchida, minúscula é casa amarela e `.` é
  // casa fechada; as linhas mais curtas se completam com casas fechadas.
  rows: string[]
  children: ReactNode
}

// Tela dividida das telas de acesso (feature 062): chamada, cruzada de enfeite e o cartão ao lado.
// A cruzada é só decoração, então fica oculta do leitor de tela.
export function AuthLayout({ headline, lead, rows, children }: AuthLayoutProps) {
  const columns = Math.max(...rows.map((row) => row.length))
  return (
    <div className={authStyles.page}>
      <div className={styles.split}>
        <div className={styles.intro}>
          <p className={styles.headline}>{headline}</p>
          <p className={styles.lead}>{lead}</p>
          <div
            className={styles.grid}
            aria-hidden="true"
            style={{ gridTemplateColumns: `repeat(${columns}, 34px)` }}
          >
            {rows.flatMap((row, rowIndex) =>
              [...row.padEnd(columns, '.')].map((char, index) => (
                <i
                  key={`${rowIndex}-${index}`}
                  className={
                    char === '.'
                      ? styles.closed
                      : char === char.toLowerCase()
                        ? styles.yellow
                        : styles.filled
                  }
                >
                  {char === '.' ? '' : char.toUpperCase()}
                </i>
              )),
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
