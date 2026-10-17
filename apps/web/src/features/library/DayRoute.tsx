import { puzzleSourceIdSchema, type PuzzleSourceId } from '@cruzadinha/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { getPuzzleByDate } from '../../api/puzzles'
import { queryKeys } from '../../api/query-keys'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { NotFoundPage } from '../../app/NotFoundPage'
import { parseIsoDate, todayInBrasilia } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { loadSourceChoice, saveSourceChoice } from './source-choice'
import { clearSourceDown, markNoPuzzle, markSourceDown } from './source-down'

export function DayRoute() {
  const { date } = useParams()
  const [params] = useSearchParams()
  // `?fonte=` válido vale e vira a preferência; sem ele (ou inválido), vale a preferência.
  const [source] = useState<PuzzleSourceId>(() => {
    const requested = puzzleSourceIdSchema.safeParse(params.get('fonte'))
    if (!requested.success) return loadSourceChoice()
    saveSourceChoice(requested.data)
    return requested.data
  })
  if (!date || !parseIsoDate(date)) return <NotFoundPage />
  return <FetchDay date={date} source={source} />
}

function BackLink() {
  return <Link to="/">Voltar à biblioteca</Link>
}

// Busca um dia passado que ainda não está guardado. O erro aparece aqui, com o motivo, e não
// dentro de uma célula do calendário.
function FetchDay({ date, source }: { date: string; source: PuzzleSourceId }) {
  useDocumentTitle('Buscando a cruzada')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isFuture = date > todayInBrasilia()
  const query = useQuery({
    queryKey: queryKeys.puzzleByDate(source, date),
    queryFn: () => getPuzzleByDate(source, date),
    enabled: !isFuture,
    retry: false,
    gcTime: 0,
  })

  // A API anterior ignora a fonte e responde O Globo: esse puzzle não é o que foi pedido.
  const data = query.data?.puzzle.source === source ? query.data : undefined
  const wrongSource = query.data !== undefined && data === undefined
  const error = query.error

  useEffect(() => {
    if (!data) return
    clearSourceDown(source)
    queryClient.setQueryData(queryKeys.puzzle(data.puzzleId), data)
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryAll })
    void navigate(`/jogo/${data.puzzleId}`, { replace: true })
  }, [data, navigate, queryClient, source])

  useEffect(() => {
    if (!(error instanceof ApiRequestError)) return
    if (error.status === 404) markNoPuzzle(source, date)
    if (error.status === 502) markSourceDown(source)
  }, [error, date, source])

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
  if (wrongSource) {
    return (
      <ErrorState
        title="Esta fonte não está disponível agora"
        message="As cruzadas das outras fontes continuam disponíveis."
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
