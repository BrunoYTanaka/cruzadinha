import { puzzleSourceNames } from '@cruzadinha/shared'
import { Link, useParams } from 'react-router'
import { ApiRequestError } from '../../shared/services/api/client'
import { ErrorState, LoadingState } from '../../shared/components/ErrorState'
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle'
import { formatDate, GameScreen, useGameData } from '../../features/game'
import { viewerKey } from '../../features/session'

function BackLink() {
  return <Link to="/">Voltar à biblioteca</Link>
}

export function GamePage() {
  const { puzzleId = '' } = useParams()
  const { viewer, response, owner, failure, retry } = useGameData(puzzleId)
  useDocumentTitle(
    response
      ? `Cruzada de ${formatDate(response.puzzle.date)} · ${puzzleSourceNames[response.puzzle.source]}`
      : 'Cruzada',
  )

  if (failure) {
    if (failure instanceof ApiRequestError && failure.status === 404) {
      return (
        <ErrorState level={1} title="Cruzada não encontrada.">
          <BackLink />
        </ErrorState>
      )
    }
    const offline = failure instanceof ApiRequestError && failure.isOffline
    return (
      <ErrorState
        level={1}
        title={offline ? 'Sem conexão' : 'Não foi possível abrir a cruzada'}
        message={offline ? 'Confira a conexão e tente de novo.' : 'Tente de novo em instantes.'}
        onRetry={retry}
      >
        <BackLink />
      </ErrorState>
    )
  }
  if (!response || !viewer || !owner) return <LoadingState label="Carregando a cruzada…" />
  // Trocar de visitante para conta (ou o inverso) monta um jogo novo, sem misturar estados.
  return <GameScreen key={`${puzzleId}:${viewerKey(viewer)}`} response={response} owner={owner} />
}
