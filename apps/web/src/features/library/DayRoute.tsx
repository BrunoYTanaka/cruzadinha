import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { getPuzzleByDate } from '../../api/puzzles'
import { queryKeys } from '../../api/query-keys'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { NotFoundPage } from '../../app/NotFoundPage'
import { parseIsoDate, todayInBrasilia } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { clearSourceDown, markNoPuzzle, markSourceDown } from './source-down'

export function DayRoute() {
  const { date } = useParams()
  if (!date || !parseIsoDate(date)) return <NotFoundPage />
  return <FetchDay date={date} />
}

function BackLink() {
  return <Link to="/">Voltar à biblioteca</Link>
}

// Busca um dia passado que ainda não está guardado. O erro aparece aqui, com o motivo, e não
// dentro de uma célula do calendário.
function FetchDay({ date }: { date: string }) {
  useDocumentTitle('Buscando a cruzada')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isFuture = date > todayInBrasilia()
  const query = useQuery({
    queryKey: queryKeys.puzzleByDate(date),
    queryFn: () => getPuzzleByDate(date),
    enabled: !isFuture,
    retry: false,
    gcTime: 0,
  })

  const data = query.data
  const error = query.error

  useEffect(() => {
    if (!data) return
    clearSourceDown()
    queryClient.setQueryData(queryKeys.puzzle(data.puzzleId), data)
    void queryClient.invalidateQueries({ queryKey: queryKeys.library })
    void navigate(`/jogo/${data.puzzleId}`, { replace: true })
  }, [data, navigate, queryClient])

  useEffect(() => {
    if (!(error instanceof ApiRequestError)) return
    if (error.status === 404) markNoPuzzle(date)
    if (error.status === 502) markSourceDown()
  }, [error, date])

  if (isFuture) {
    return (
      <ErrorState
        title="Esse dia ainda não chegou"
        message="A cruzada só existe a partir do próprio dia."
      >
        <BackLink />
      </ErrorState>
    )
  }
  if (query.isError) {
    const failure = query.error
    if (failure instanceof ApiRequestError) {
      if (failure.status === 404) {
        return (
          <ErrorState title="Não há cruzada neste dia.">
            <BackLink />
          </ErrorState>
        )
      }
      if (failure.status === 502) {
        return (
          <ErrorState
            title="A fonte está fora do ar agora."
            message="Tente mais tarde. As cruzadas já guardadas continuam disponíveis."
            onRetry={() => void query.refetch()}
          >
            <BackLink />
          </ErrorState>
        )
      }
      if (failure.status === 429) {
        return (
          <ErrorState
            title="Muitas buscas seguidas."
            waitSeconds={failure.retryAfterSeconds ?? 60}
            onRetry={() => void query.refetch()}
          >
            <BackLink />
          </ErrorState>
        )
      }
      if (failure.isOffline) {
        return (
          <ErrorState
            title="Sem conexão"
            message="Confira a conexão e tente de novo."
            onRetry={() => void query.refetch()}
          >
            <BackLink />
          </ErrorState>
        )
      }
    }
    return (
      <ErrorState
        title="Não foi possível buscar a cruzada"
        message="Tente de novo em instantes."
        onRetry={() => void query.refetch()}
      >
        <BackLink />
      </ErrorState>
    )
  }
  return <LoadingState label="Buscando a cruzada…" />
}
