import type { DuelView } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import { ErrorState } from '../../../../shared/components/ErrorState/ErrorState'
import { LoadingState } from '../../../../shared/components/LoadingState/LoadingState'
import { getPuzzleById } from '../../../../shared/services/api/puzzles/puzzles'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'
import type { GuestProgress } from '../../../../domain/guest/guest-progress'
import { GameScreen, type GameOwner } from '../../../game'
import { finishDuel, forfeitDuel, type DuelCredential } from '../../services/duel-api'
import {
  clearDuelProgress,
  duelGameStore,
  duelQueueFactory,
  finishWithRetry,
  helpsOf,
} from '../../services/duel-progress'
import { ForfeitConfirm } from '../ForfeitConfirm/ForfeitConfirm'

type Props = {
  credential: DuelCredential
  view: DuelView
  puzzleId: string
  // `serverNow` da resposta que trouxe o início e quando ela chegou: dos dois sai a diferença entre
  // o relógio do servidor e o deste aparelho.
  serverNow: string
  receivedAt: number
  // O servidor mudou o duelo (terminou, desistiu): a página busca o estado de novo.
  onChanged: () => void
}

// A partida de um duelo (feature 058): o tabuleiro de sempre, com o relógio do servidor, o progresso
// guardado só deste duelo e a conclusão enviada ao servidor.
export function DuelBoard({ credential, view, puzzleId, serverNow, receivedAt, onChanged }: Props) {
  const puzzle = useQuery({
    queryKey: queryKeys.puzzle(puzzleId),
    queryFn: () => getPuzzleById(puzzleId),
    staleTime: Infinity,
  })
  const [record, setRecord] = useState<GuestProgress | null | undefined>(undefined)
  const grid = puzzle.data?.puzzle.grid

  useEffect(() => {
    if (!grid) return
    let cancelled = false
    void duelGameStore.getForPuzzle(view.duelId, grid).then((found) => {
      if (!cancelled) setRecord(found)
    })
    return () => {
      cancelled = true
    }
  }, [grid, view.duelId])

  // Início no relógio do aparelho: o início do servidor menos a diferença medida uma vez.
  const [startedAtMs] = useState(() =>
    view.me.startedAt ? Date.parse(view.me.startedAt) - (Date.parse(serverNow) - receivedAt) : 0,
  )

  const [confirming, setConfirming] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  const [forfeitError, setForfeitError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  const finished = useCallback(() => {
    void clearDuelProgress(view.duelId, puzzleId)
    onChanged()
  }, [view.duelId, puzzleId, onChanged])

  const createQueue = useMemo(
    () =>
      duelQueueFactory({
        duelId: view.duelId,
        finish: (helpsUsed) => finishDuel({ ...credential, helpsUsed }),
        onFinished: finished,
      }),
    [view.duelId, credential, finished],
  )

  // Concluído neste aparelho, mas o envio não chegou ao servidor (a página fechou no meio): reenvia.
  const completedLocally = record?.status === 'completed'
  useEffect(() => {
    if (!completedLocally) return
    let stopped = false
    void finishWithRetry(helpsOf(record?.help), {
      finish: (helpsUsed) => finishDuel({ ...credential, helpsUsed }),
      onFinished: finished,
      onWaiting: setWaiting,
      isStopped: () => stopped,
    })
    return () => {
      stopped = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reenvia uma vez por abertura
  }, [completedLocally])

  async function onForfeit() {
    setForfeiting(true)
    setForfeitError(null)
    try {
      await forfeitDuel(credential)
      setConfirming(false)
      void clearDuelProgress(view.duelId, puzzleId)
      onChanged()
    } catch {
      setForfeitError('Não foi possível desistir agora. Tente de novo.')
    } finally {
      setForfeiting(false)
    }
  }

  const toolbarAction = useMemo(
    () => (
      <Button variant="quiet" onClick={() => setConfirming(true)}>
        Desistir
      </Button>
    ),
    [],
  )

  if (puzzle.isError) {
    return (
      <ErrorState
        level={1}
        title="Não foi possível abrir a cruzada do x1"
        message="O relógio continua correndo no servidor. Tente de novo."
        onRetry={() => void puzzle.refetch()}
      />
    )
  }
  if (!puzzle.data || record === undefined) return <LoadingState screen="game" level={2} />

  if (completedLocally) {
    return (
      <p role="status">
        {waiting ? 'Sem conexão: tentando enviar o seu resultado…' : 'Enviando o seu resultado…'}
      </p>
    )
  }

  const owner: GameOwner = {
    kind: 'duel',
    record,
    store: duelGameStore,
    createQueue,
    duel: {
      duelId: view.duelId,
      startedAtMs,
      helpMode: view.rules.helpMode,
      toolbarAction,
    },
  }

  return (
    <>
      <GameScreen key={view.duelId} response={puzzle.data} owner={owner} />
      {confirming ? (
        <ForfeitConfirm
          kind="forfeit"
          busy={forfeiting}
          error={forfeitError}
          onConfirm={() => void onForfeit()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  )
}
