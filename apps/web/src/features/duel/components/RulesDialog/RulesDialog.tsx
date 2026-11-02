import { puzzleSourceNames, type LookupDuelResponse } from '@cruzadinha/shared'
import { Button } from '../../../../shared/components/Button/Button'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import { Field } from '../../../../shared/components/Field/Field'
import { clockText, deadlineText, helpText, maxTimeText } from '../../helpers/rules-text'
import styles from './RulesDialog.module.css'

type Props = {
  duel: Pick<LookupDuelResponse, 'rules' | 'source' | 'puzzleDate' | 'creatorNickname'>
  nickname: string
  onNicknameChange: (value: string) => void
  busy: boolean
  error: string | null
  onStart: () => void
  onLater: () => void
  onDecline: () => void
}

const noop = () => {}

// Regras antes de começar (feature 058): não fecha por clique fora nem por Esc; só os três botões.
export function RulesDialog({
  duel,
  nickname,
  onNicknameChange,
  busy,
  error,
  onStart,
  onLater,
  onDecline,
}: Props) {
  const date = duel.puzzleDate.split('-').reverse().join('/')
  return (
    <Dialog
      open
      onClose={noop}
      title={`${duel.creatorNickname} desafiou você`}
      description={`${puzzleSourceNames[duel.source]}, cruzada de ${date}. Uma única tentativa: vence o menor tempo.`}
    >
      <ul className={styles.rules}>
        <li>{helpText(duel.rules)}</li>
        <li>{maxTimeText(duel.rules.maxMs)}</li>
        <li>{deadlineText(duel.rules.startDeadlineAt)}</li>
        <li>{clockText}</li>
      </ul>
      <Field
        label="Seu apelido"
        value={nickname}
        maxLength={24}
        autoComplete="nickname"
        onChange={(event) => onNicknameChange(event.target.value)}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button variant="quiet" onClick={onDecline} disabled={busy}>
          Recusar desafio
        </Button>
        <Button variant="secondary" onClick={onLater} disabled={busy}>
          Agora não
        </Button>
        <Button variant="primary" onClick={onStart} disabled={busy} data-autofocus>
          {busy ? 'Começando…' : 'Começar'}
        </Button>
      </div>
    </Dialog>
  )
}
