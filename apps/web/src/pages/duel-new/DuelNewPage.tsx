import type { CreateDuelResponse } from '@cruzadinha/shared'
import { useState } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../../shared/components/Button/Button'
import { RequiresConnection } from '../../shared/components/RequiresConnection/RequiresConnection'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle/useDocumentTitle'
import { CreateForm, ShareLinkPanel } from '../../features/duel'
import styles from './DuelNewPage.module.css'

export function DuelNewPage() {
  useDocumentTitle('Novo x1')
  const [created, setCreated] = useState<CreateDuelResponse | null>(null)
  return (
    <RequiresConnection>
      <div className={styles.page}>
        {created ? (
          <>
            <h1 className={styles.title}>x1 criado</h1>
            <p className={styles.lead}>
              Envie o link ou o código para quem você quer desafiar. Você pode jogar a sua partida
              quando quiser.
            </p>
            <ShareLinkPanel
              linkToken={created.linkToken}
              code={created.code}
              participantToken={created.participantToken}
            />
            <Link
              to={`/x1/${created.linkToken}`}
              className={`${buttonClass({ variant: 'primary' })} ${styles.open}`}
            >
              Abrir o meu x1
            </Link>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Novo x1</h1>
            <p className={styles.lead}>
              Desafie alguém: cada um joga quando quiser, uma única tentativa, e vence o menor
              tempo.
            </p>
            <CreateForm onCreated={setCreated} />
          </>
        )}
      </div>
    </RequiresConnection>
  )
}
