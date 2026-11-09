import { puzzleSourceNames, type DuelStateResponse, type DuelView } from '@cruzadinha/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { Link as TextLink } from '../../../../shared/components/Link/Link'
import { Button } from '../../../../shared/components/Button/Button'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { ApiRequestError } from '../../../../shared/services/api/client/client'
import { formatWait } from '../../../../shared/helpers/time/time'
import { useDocumentTitle } from '../../../../shared/hooks/useDocumentTitle/useDocumentTitle'
import { clockText, deadlineText, helpText, maxTimeText } from '../../helpers/rules-text'
import { duelStateKey, useDuelState } from '../../hooks/useDuelState'
import { useParticipantToken } from '../../hooks/useParticipantToken'
import {
  cancelDuel,
  declineDuel,
  isDuelUnavailable,
  lookupDuel,
  startDuel,
  type DuelCredential,
} from '../../services/duel-api'
import { clearDuelProgress } from '../../services/duel-progress'
import { loadNickname, saveNickname } from '../../services/duel-nickname'
import { duelTokens } from '../../services/duel-tokens'
import { DuelBoard } from '../DuelBoard/DuelBoard'
import { ForfeitConfirm } from '../ForfeitConfirm/ForfeitConfirm'
import { ResultPanel } from '../ResultPanel/ResultPanel'
import { RulesPanel } from '../RulesPanel/RulesPanel'
import { ShareLinkPanel } from '../ShareLinkPanel/ShareLinkPanel'
import styles from './DuelScreen.module.css'

function startErrorText(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'duel-taken') return 'Este x1 já foi aceito por outra pessoa.'
    if (error.status === 404) return 'Este x1 não está mais aberto.'
    if (error.status === 429) {
      const wait = error.retryAfterSeconds
        ? ` Tente de novo em ${formatWait(error.retryAfterSeconds)}.`
        : ''
      return `Muitas tentativas.${wait}`
    }
    if (error.status === 400) return 'Confira o apelido: de 1 a 24 caracteres.'
    if (error.isOffline) return 'Sem conexão. Confira a rede e tente de novo.'
  }
  return 'Não foi possível começar agora. Tente de novo.'
}

const Unavailable = () => (
  <ErrorState level={1} title="O x1 não está disponível agora" message="Tente de novo mais tarde.">
    <TextLink to="/calendario">Voltar ao calendário</TextLink>
  </ErrorState>
)

// Quem abre o link sem ser participante: vê as regras e decide (feature 058). Abrir não muda nada;
// só "Começar" e "Recusar desafio" agem.
function Invite({ linkToken, onJoined }: { linkToken: string; onJoined: () => void }) {
  const queryClient = useQueryClient()
  const lookup = useQuery({
    queryKey: ['duel-lookup', linkToken],
    queryFn: () => lookupDuel({ linkToken }),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const [nickname, setNickname] = useState(loadNickname)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [declined, setDeclined] = useState(false)
  useDocumentTitle('Convite de x1')

  if (lookup.isPending) return <LoadingState screen="entry" level={1} />
  if (lookup.isError) {
    if (isDuelUnavailable(lookup.error)) return <Unavailable />
    if (lookup.error instanceof ApiRequestError && lookup.error.status === 429) {
      return (
        <ErrorState
          level={1}
          title="Muitas tentativas"
          message="Espere um pouco e tente de novo."
        />
      )
    }
    return (
      <ErrorState level={1} title="Este x1 não está aberto" message="O link não vale mais.">
        <TextLink to="/x1">Meus x1</TextLink>
      </ErrorState>
    )
  }
  if (declined) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Desafio recusado</h1>
        <p className={styles.lead}>O criador vê que você recusou.</p>
      </div>
    )
  }

  async function onStart() {
    setBusy(true)
    setError(null)
    try {
      const started = await startDuel({ linkToken, nickname: nickname.trim() })
      saveNickname(nickname)
      if (started.participantToken) await duelTokens.save(linkToken, started.participantToken)
      void queryClient.invalidateQueries({ queryKey: ['duel-tokens'] })
      void queryClient.invalidateQueries({ queryKey: ['my-duels'] })
      // Quem acabou de começar já é participante: o estado vem direto da resposta.
      queryClient.setQueryData<DuelStateResponse>(duelStateKey(linkToken), {
        duel: started.duel,
        puzzleId: started.puzzleId,
        serverNow: started.serverNow,
      })
      // O token acabou de ser guardado: a página passa a usá-lo.
      onJoined()
    } catch (caught) {
      setError(startErrorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function onDecline() {
    setBusy(true)
    setError(null)
    try {
      await declineDuel({ linkToken })
      setDeclined(true)
    } catch (caught) {
      setError(startErrorText(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${styles.page} ${styles.invite}`}>
      <h1 className={styles.title}>Convite de x1</h1>
      <RulesPanel
        duel={lookup.data}
        nickname={nickname}
        onNicknameChange={setNickname}
        busy={busy}
        error={error}
        onStart={() => void onStart()}
        onDecline={() => void onDecline()}
      />
    </div>
  )
}

function Rules({ view }: { view: DuelView }) {
  return (
    <ul className={styles.rules}>
      <li>{helpText(view.rules)}</li>
      <li>{maxTimeText(view.rules.maxMs)}</li>
      <li>{deadlineText(view.rules.startDeadlineAt)}</li>
      <li>{clockText}</li>
    </ul>
  )
}

// Quem participa: antes de começar, jogando, esperando ou vendo o resultado.
function Participant({
  linkToken,
  credential,
  participantToken,
  state,
  receivedAt,
  onChanged,
}: {
  linkToken: string
  credential: DuelCredential
  participantToken: string | null
  state: DuelStateResponse
  receivedAt: number
  onChanged: () => void
}) {
  const { duel: view } = state
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  useDocumentTitle(`x1 · ${puzzleSourceNames[view.source]}`)
  const live = view.status === 'open' || view.status === 'running'

  async function onBegin() {
    setBusy(true)
    setError(null)
    try {
      const started = await startDuel({ ...credential, nickname: view.me.nickname })
      queryClient.setQueryData<DuelStateResponse>(duelStateKey(linkToken), {
        duel: started.duel,
        puzzleId: started.puzzleId,
        serverNow: started.serverNow,
      })
    } catch (caught) {
      setError(startErrorText(caught))
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    setBusy(true)
    setError(null)
    try {
      await cancelDuel(credential)
      setCanceling(false)
      void clearDuelProgress(view.duelId, state.puzzleId ?? '')
      onChanged()
    } catch {
      setError('Não foi possível cancelar agora. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (live && view.myStatus === 'playing' && state.puzzleId) {
    return (
      <DuelBoard
        credential={credential}
        view={view}
        puzzleId={state.puzzleId}
        serverNow={state.serverNow}
        receivedAt={receivedAt}
        onChanged={onChanged}
      />
    )
  }

  if (live && view.myStatus === 'not-started') {
    const waitingOpponent = view.status === 'open'
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>
          {puzzleSourceNames[view.source]}, {view.puzzleDate.split('-').reverse().join('/')}
        </h1>
        <p className={styles.lead}>
          {waitingOpponent
            ? 'Envie o link ou o código. Você pode começar a sua partida quando quiser; ela não espera o oponente.'
            : `${view.opponentNickname ?? 'O oponente'} já aceitou. Falta você começar.`}
        </p>
        <Rules view={view} />
        {waitingOpponent && view.code ? (
          <ShareLinkPanel
            linkToken={linkToken}
            code={view.code}
            participantToken={participantToken ?? undefined}
          />
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void onBegin()} disabled={busy}>
            {busy ? 'Começando…' : 'Começar a minha partida'}
          </Button>
          {waitingOpponent && view.role === 'creator' ? (
            <Button variant="quiet" onClick={() => setCanceling(true)} disabled={busy}>
              Cancelar x1
            </Button>
          ) : null}
        </div>
        {canceling ? (
          <ForfeitConfirm
            kind="cancel"
            busy={busy}
            error={error}
            onConfirm={() => void onCancel()}
            onCancel={() => setCanceling(false)}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <ResultPanel view={view} />
      {live && view.status === 'open' && view.code ? (
        <ShareLinkPanel
          linkToken={linkToken}
          code={view.code}
          participantToken={participantToken ?? undefined}
        />
      ) : null}
    </div>
  )
}

export function DuelScreen({ linkToken }: { linkToken: string }) {
  const queryClient = useQueryClient()
  const { token, reload } = useParticipantToken(linkToken)
  const state = useDuelState(linkToken, token)
  const credential = useMemo<DuelCredential>(
    () => ({ linkToken, ...(token ? { participantToken: token } : {}) }),
    [linkToken, token],
  )

  const onChanged = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: duelStateKey(linkToken) })
    void queryClient.invalidateQueries({ queryKey: ['my-duels'] })
  }, [queryClient, linkToken])

  if (token === undefined || state.isPending) {
    return <LoadingState screen="entry" level={1} />
  }
  if (state.isError) {
    const error = state.error
    if (isDuelUnavailable(error)) return <Unavailable />
    // 404 com código: este aparelho não participa do duelo.
    if (error instanceof ApiRequestError && error.status === 404)
      return <Invite linkToken={linkToken} onJoined={reload} />
    return (
      <ErrorState
        level={1}
        title="Não foi possível abrir o x1"
        message={
          error instanceof ApiRequestError && error.isOffline
            ? 'Sem conexão. Confira a rede e tente de novo.'
            : 'Tente de novo em instantes.'
        }
      >
        <TextLink to="/x1">Meus x1</TextLink>
      </ErrorState>
    )
  }
  return (
    <Participant
      linkToken={linkToken}
      credential={credential}
      participantToken={token}
      state={state.data}
      receivedAt={state.dataUpdatedAt}
      onChanged={onChanged}
    />
  )
}
