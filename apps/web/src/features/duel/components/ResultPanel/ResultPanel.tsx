import { puzzleSourceNames, type DuelView } from '@cruzadinha/shared'
import { Link } from 'react-router'
import { VisuallyHidden } from '../../../../shared/components/VisuallyHidden/VisuallyHidden'
import { buttonClass } from '../../../../shared/components/Button/Button'
import { endedText, headline, reasonText } from '../../helpers/result-text'
import { timeText } from '../../helpers/rules-text'
import styles from './ResultPanel.module.css'

const endLabel = {
  completed: 'Concluiu',
  forfeit: 'Desistiu',
  timeout: 'Tempo esgotado',
} as const

type ResultSide = NonNullable<DuelView['result']>['me']

function Side({ side, label, won }: { side: ResultSide; label: string; won: boolean }) {
  return (
    <tr>
      <th scope="row">
        {side.nickname} <span className={styles.reason}>({label})</span>
      </th>
      <td>{side.endReason ? endLabel[side.endReason] : 'Não jogou'}</td>
      <td className={won ? styles.won : undefined}>{timeText(side.elapsedMs)}</td>
      <td>{side.penaltyMs > 0 ? `+${timeText(side.penaltyMs)}` : '—'}</td>
      <td>{side.helpsUsed}</td>
    </tr>
  )
}

// Resultado final (feature 058) ou o que aconteceu com um duelo sem resultado. Antes do resultado,
// quem terminou vê só "Aguardando o oponente", nunca o tempo do outro.
export function ResultPanel({ view }: { view: DuelView }) {
  const where = `${puzzleSourceNames[view.source]}, ${view.puzzleDate.split('-').reverse().join('/')}`
  const links = (
    <div className={styles.links}>
      <Link to="/x1" className={buttonClass({ variant: 'primary' })}>
        Meus x1
      </Link>
      <Link to="/x1/novo" className={buttonClass({ variant: 'secondary' })}>
        Novo x1
      </Link>
      <Link to="/calendario" className={buttonClass({ variant: 'quiet' })}>
        Calendário
      </Link>
    </div>
  )

  if (view.result) {
    const { result } = view
    return (
      <section className={styles.panel} aria-labelledby="duel-result-title">
        <h1 id="duel-result-title" className={styles.headline}>
          {headline(result)}
        </h1>
        <p className={styles.reason}>
          {where}. {reasonText(result)}
        </p>
        <table className={styles.table}>
          <caption>
            <VisuallyHidden>Tempos dos dois jogadores</VisuallyHidden>
          </caption>
          <thead>
            <tr>
              <th scope="col">Jogador</th>
              <th scope="col">Fim</th>
              <th scope="col">Tempo</th>
              <th scope="col">Penalidade</th>
              <th scope="col">Ajudas</th>
            </tr>
          </thead>
          <tbody>
            <Side side={result.me} label="você" won={result.verdict === 'won'} />
            {result.opponent ? (
              <Side side={result.opponent} label="oponente" won={result.verdict === 'lost'} />
            ) : null}
          </tbody>
        </table>
        {links}
      </section>
    )
  }

  if (view.myStatus === 'waiting-other') {
    return (
      <section className={styles.panel} aria-labelledby="duel-wait-title">
        <h1 id="duel-wait-title" className={styles.headline}>
          Aguardando o oponente
        </h1>
        <p className={styles.reason} role="status">
          {where}. Você terminou. O resultado aparece quando {view.opponentNickname ?? 'o oponente'}{' '}
          terminar ou o prazo vencer.
        </p>
        {links}
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-labelledby="duel-ended-title">
      <h1 id="duel-ended-title" className={styles.headline}>
        {endedText[view.status] ?? 'Este x1 terminou.'}
      </h1>
      <p className={styles.reason}>{where}.</p>
      {links}
    </section>
  )
}
