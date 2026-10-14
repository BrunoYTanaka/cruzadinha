import type { Progress, PuzzleResponse, SaveProgressRequest, User } from '@cruzadinha/shared'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { ApiRequestError } from '../../api/client'
import { getProgress, resetProgress, saveProgress } from '../../api/progress'
import { config } from '../../config'
import { removeStorage } from '../../lib/storage'
import { isSolved } from '../../game-logic/completion'
import { createGame, type GameAction, type HelpSnapshot } from '../../game-logic/reducer'
import type { GameState } from '../../game-logic/state'
import { clearHelp, loadHelp, saveHelp } from './help-storage'
import { createSaveQueue, outboxKey, readOutbox } from './save-queue'
import { useClock } from './useClock'

type UseGameArgs = {
  response: PuzzleResponse
  // Progresso do servidor ao abrir (ou `null` se nunca jogou).
  progress: Progress | null
  user: User
}

// Escolhe de onde vêm as letras ao abrir: o servidor, ou a fila local se ela for mais nova (letras
// que não chegaram a ser enviadas antes da página fechar).
function initialSource(progress: Progress | null, outbox: SaveProgressRequest | null) {
  if (outbox && (!progress || outbox.savedAt > progress.savedAt)) {
    return { cells: outbox.cells, elapsedMs: outbox.elapsedMs, fromOutbox: true }
  }
  return progress
    ? { cells: progress.cells, elapsedMs: progress.elapsedMs, fromOutbox: false }
    : { cells: null, elapsedMs: 0, fromOutbox: false }
}

export function useGame({ response, progress, user }: UseGameArgs) {
  const { puzzle, solution, puzzleId } = {
    ...response,
    puzzle: response.puzzle,
    solution: response.solution,
  }
  const game = useMemo(
    () => createGame({ puzzle, solution, limits: config.helpLimits }),
    [puzzle, solution],
  )

  const [serverProgress, setServerProgress] = useState<Progress | null>(progress)

  // O estado inicial junta o progresso do servidor e a fila local, uma única vez.
  const [source] = useState(() => initialSource(progress, readOutbox(user.id, puzzleId)))

  const [state, dispatch] = useReducer(game.reducer, game.initialState, (start): GameState => {
    if (progress?.status === 'completed') {
      return game.reducer(start, { type: 'viewServerProgress', cells: progress.cells })
    }
    // Ajudas ficam só neste aparelho (por conta e cruzada); sem letras guardadas não valem nada.
    const help = loadHelp(user.id, puzzleId)
    if (source.cells) return game.reducer(start, { type: 'hydrate', cells: source.cells, help })
    return help ? game.reducer(start, { type: 'hydrate', cells: start.cells, help }) : start
  })

  // Cada mudança de ajuda (contadores, marcas, células travadas) vai para o aparelho.
  useEffect(() => {
    const snapshot: HelpSnapshot = {
      usage: state.usage,
      marks: state.marks,
      locked: state.locked.flatMap((line, row) =>
        line.flatMap((isLocked, col) => (isLocked ? [`${row},${col}`] : [])),
      ),
    }
    const used = snapshot.usage.letters + snapshot.usage.words > 0
    if (used || Object.keys(snapshot.marks).length > 0) saveHelp(user.id, puzzleId, snapshot)
  }, [state.usage, state.marks, state.locked, user.id, puzzleId])

  const clock = useClock(source.elapsedMs, state.mode === 'playing')
  const { readElapsedMs, stop: stopClock } = clock

  const queue = useMemo(
    () =>
      createSaveQueue({
        puzzleId,
        userId: user.id,
        save: saveProgress,
        onProgress: (saved, body) => {
          if (saved) setServerProgress(saved)
          if (body.status === 'completed') dispatch({ type: 'confirmCompletion' })
        },
      }),
    [puzzleId, user.id, dispatch],
  )
  const saveState = useSyncExternalStore(queue.subscribe, queue.getState, queue.getState)

  // Letras novas vão para a fila de salvamento (com debounce); o que veio do servidor não.
  const savedCells = useRef(state.cells)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  useEffect(() => {
    if (state.mode !== 'playing' || state.cells === savedCells.current) return
    savedCells.current = state.cells
    queue.schedule({ cells: state.cells, elapsedMs: readElapsedMs(), status: 'in_progress' })
  }, [state.cells, state.mode, queue, readElapsedMs])

  // Ao sair da tela de jogo (navegação dentro do site), o que ainda estava esperando o debounce
  // sai agora; só depois os temporizadores são cancelados.
  useEffect(
    () => () => {
      const current = stateRef.current
      if (current.mode === 'playing' && current.cells.some((row) => row.some(Boolean))) {
        void queue.sendNow(
          { cells: current.cells, elapsedMs: readElapsedMs(), status: 'in_progress' },
          { keepalive: true },
        )
      }
      queue.dispose()
    },
    [queue, readElapsedMs],
  )

  // Letras da fila local que ainda não chegaram ao servidor seguem na abertura.
  useEffect(() => {
    if (source.fromOutbox) void queue.retry()
  }, [source.fromOutbox, queue])

  // Grade certa: o relógio para e a conclusão sai na hora, com prioridade.
  useEffect(() => {
    if (state.completion !== 'pending') return
    stopClock()
    void queue.sendNow({ cells: state.cells, elapsedMs: readElapsedMs(), status: 'completed' })
  }, [state.completion, state.cells, queue, readElapsedMs, stopClock])

  // Outro aparelho concluiu: o jogo só avisa.
  useEffect(() => {
    if (saveState === 'completed-elsewhere') dispatch({ type: 'markElsewhere' })
  }, [saveState, dispatch])

  // Ao ocultar a aba ou sair da página, envia o que falta com `keepalive`.
  useEffect(() => {
    function leave() {
      const current = stateRef.current
      if (current.mode !== 'playing') return
      void queue.sendNow(
        { cells: current.cells, elapsedMs: readElapsedMs(), status: 'in_progress' },
        { keepalive: true },
      )
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') leave()
    }
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', leave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [queue, readElapsedMs])

  // Voltou a rede: reenvia o que ficou na fila.
  useEffect(() => {
    const onOnline = () => void queue.retry()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [queue])

  // A conclusão aconteceu nesta sessão de jogo (e não é uma cruzada já concluída ao abrir): só então
  // a janela de conclusão abre.
  const [completedHere, setCompletedHere] = useState(false)
  if (state.completion === 'pending' && !completedHere) setCompletedHere(true)

  // "Jogar de novo": exige o servidor (ele guarda o melhor tempo); sem ele, nada é reiniciado aqui.
  const playAgain = useCallback(async (): Promise<'ok' | 'offline' | 'error'> => {
    try {
      const { progress: fresh } = await resetProgress(puzzleId)
      setServerProgress(fresh)
      clearHelp(user.id, puzzleId)
      removeStorage(outboxKey(user.id, puzzleId))
      savedCells.current = game.initialState.cells
      dispatch({ type: 'reset' })
      setCompletedHere(false)
      clock.restart()
      return 'ok'
    } catch (error) {
      return error instanceof ApiRequestError && error.isOffline ? 'offline' : 'error'
    }
  }, [puzzleId, user.id, game, clock])

  // "Ver como ficou": só se a pessoa escolher, carrega o progresso concluído do servidor.
  const viewCompleted = useCallback(async (): Promise<boolean> => {
    try {
      const { progress: fresh } = await getProgress(puzzleId)
      if (!fresh || fresh.status !== 'completed') return false
      setServerProgress(fresh)
      stopClock()
      dispatch({ type: 'viewServerProgress', cells: fresh.cells })
      return true
    } catch {
      return false
    }
  }, [puzzleId, stopClock])

  const send = useCallback((action: GameAction) => dispatch(action), [])

  return {
    game,
    state,
    dispatch: send,
    clock,
    queue,
    saveState,
    serverProgress,
    completedHere,
    playAgain,
    viewCompleted,
    solved: isSolved(state.cells, solution),
  }
}
