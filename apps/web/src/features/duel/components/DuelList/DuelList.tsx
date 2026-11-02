import { puzzleSourceNames, type DuelSummary } from '@cruzadinha/shared'
import { Link } from 'react-router'
import styles from './DuelList.module.css'

function statusText(duel: DuelSummary): string {
  if (duel.status === 'finished') return 'Terminou: veja o resultado'
  if (duel.status === 'open') {
    return duel.role === 'creator' ? 'Aguardando alguém aceitar' : 'Aberto: falta você começar'
  }
  switch (duel.myStatus) {
    case 'not-started':
      return 'Em andamento: falta você começar'
    case 'playing':
      return 'Em andamento: você está jogando'
    default:
      return 'Aguardando o oponente'
  }
}

type Props = { duels: readonly DuelSummary[]; guest: boolean }

export function DuelList({ duels, guest }: Props) {
  return (
    <div>
      {guest ? (
        <p className={styles.note}>
          Esta lista vale só para este aparelho. Entre numa conta para ver seus x1 em qualquer
          lugar.
        </p>
      ) : null}
      {duels.length === 0 ? (
        <p className={styles.empty}>Nenhum x1 ativo.</p>
      ) : (
        <ul className={styles.list}>
          {duels.map((duel) => (
            <li
              key={duel.duelId}
              className={`${styles.item} ${duel.attention ? styles.attention : ''}`}
            >
              <span>
                <Link to={`/x1/${duel.linkToken}`} className={styles.title}>
                  {puzzleSourceNames[duel.source]}, {duel.puzzleDate.split('-').reverse().join('/')}
                </Link>
                {duel.opponentNickname ? ` contra ${duel.opponentNickname}` : ''}
              </span>
              <span className={styles.status}>{statusText(duel)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
