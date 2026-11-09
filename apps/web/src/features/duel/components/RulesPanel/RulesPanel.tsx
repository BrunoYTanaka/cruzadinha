import { puzzleSourceNames, type LookupDuelResponse } from '@cruzadinha/shared'
import { Button } from '../../../../shared/components/Button/Button'
import { Field } from '../../../../shared/components/Field/Field'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { clockText, deadlineText, helpText, maxTimeText } from '../../helpers/rules-text'
import styles from './RulesPanel.module.css'

type Props = {
  duel: Pick<LookupDuelResponse, 'rules' | 'source' | 'puzzleDate' | 'creatorNickname'>
  nickname: string
  onNicknameChange: (value: string) => void
  busy: boolean
  error: string | null
  onStart: () => void
  onDecline: () => void
}

// Regras antes de começar (feature 058): na própria página, como no artefato (feature 062). Quem
// desafiou e qual cruzada continuam ditos no começo: é o que a pessoa precisa para decidir.
export function RulesPanel({
  duel,
  nickname,
  onNicknameChange,
  busy,
  error,
  onStart,
  onDecline,
}: Props) {
  const date = duel.puzzleDate.split('-').reverse().join('/')
  return (
    <>
      <p className={styles.lead}>
        {duel.creatorNickname} desafiou você: {puzzleSourceNames[duel.source]}, cruzada de {date}.
        Uma única tentativa: vence o menor tempo.
      </p>
      <section className={styles.panel} aria-labelledby="duel-rules-title">
        <h2 id="duel-rules-title" className={styles.heading}>
          Regras
        </h2>
        <ul className={styles.rules}>
          <li>{helpText(duel.rules)}</li>
          <li>{maxTimeText(duel.rules.maxMs)}</li>
          <li>{deadlineText(duel.rules.startDeadlineAt)}</li>
          <li>{clockText}</li>
        </ul>
      </section>
      <Field
        label="Seu apelido"
        value={nickname}
        maxLength={24}
        autoComplete="nickname"
        onChange={(event) => onNicknameChange(event.target.value)}
      />
      {error ? <Notice variant="error">{error}</Notice> : null}
      <div className={styles.actions}>
        <Button variant="primary" onClick={onStart} disabled={busy}>
          {busy ? 'Começando…' : 'Começar'}
        </Button>
        <Button variant="quiet" onClick={onDecline} disabled={busy}>
          Recusar
        </Button>
      </div>
    </>
  )
}
