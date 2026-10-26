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
import { ApiRequestError } from '../../shared/services/api/client'
import { getProgress, resetProgress, saveProgress } from '../../shared/services/api/progress'
import { config } from '../../shared/services/config'
import { removeStorage } from '../../shared/services/storage'
import { struckWords, type StrikeMode } from '../../domain/game/clue-strike'
import { isSolved } from '../../domain/game/completion'
import type { GuestProgress } from '../../domain/guest/guest-progress'
import { createGame, type GameAction, type HelpSnapshot } from '../../domain/game/reducer'
import type { GameLimits, GameState } from '../../domain/game/state'
import type { GuestSaveQueueOptions } from '../guest'
import type { GuestStore } from '../guest'
import { useSettingsOpen } from '../settings'
import { useSettings } from '../../shared/services/settings-store'
import { clearHelp, loadHelp, saveHelp } from './help-storage'
import { createSaveQueue, outboxKey, readOutbox, type SaveQueue } from './save-queue'
import { useClock } from './useClock'

// Dono da partida (feature 013): a conta salva no servidor; o visitante, só no navegador. Os dois
// nunca leem nem gravam o lugar do outro (FR-011).
export type GameOwner =
  | { kind: 'user'; user: User; progress: Progress | null }
  | {
      kind: 'guest'
      record: GuestProgress | null
      store: GuestStore
      // A página entrega a fila do visitante, para o jogo não depender da feature guest.
      createQueue: (options: GuestSaveQueueOptions) => SaveQueue
    }

// O que a tela mostra de tempo final e recorde, venha do servidor ou do navegador.
export type ProgressSummary = Pick<Progress, 'status' | 'finishedMs' | 'bestMs'>

type UseGameArgs = { response: PuzzleResponse; owner: GameOwner }

type Source = { cells: (string | null)[][] | null; elapsedMs: number; fromOutbox: boolean }

// Escolhe de onde vêm as letras ao abrir: o servidor, ou a fila local se ela for mais nova (letras
// que não chegaram a ser enviadas antes da página fechar). O visitante só tem o registro local.
function initialSource(owner: GameOwner, puzzleId: string): Source {
  if (owner.kind === 'guest') {
    return owner.record
      ? { cells: owner.record.cells, elapsedMs: owner.record.elapsedMs, fromOutbox: false }
      : { cells: null, elapsedMs: 0, fromOutbox: false }
  }
  const { progress } = owner
  const outbox: SaveProgressRequest | null = readOutbox(owner.user.id, puzzleId)
  if (outbox && (!progress || outbox.savedAt > progress.savedAt)) {
    return { cells: outbox.cells, elapsedMs: outbox.elapsedMs, fromOutbox: true }
  }
  return progress
    ? { cells: progress.cells, elapsedMs: progress.elapsedMs, fromOutbox: false }
    : { cells: null, elapsedMs: 0, fromOutbox: false }
}

function summaryOf(owner: GameOwner): ProgressSummary | null {
  return owner.kind === 'guest' ? owner.record : owner.progress
}

function helpOf(state: Pick<GameState, 'usage' | 'marks' | 'locked'>): HelpSnapshot {
  return {
    usage: state.usage,
    marks: state.marks,
    locked: state.locked.flatMap((line, row) =>
      line.flatMap((isLocked, col) => (isLocked ? [`${row},${col}`] : [])),
    ),
  }
}

function hasHelp(help: HelpSnapshot): boolean {
  return help.usage.letters + help.usage.words > 0 || Object.keys(help.marks).length > 0
}

export function useGame({ response, owner }: UseGameArgs) {
  const { puzzle, solution, puzzleId } = response
  const game = useMemo(
    () => createGame({ puzzle, solution, limits: config.helpLimits }),
    [puzzle, solution],
  )
  const guest = owner.kind === 'guest'
  const userId = owner.kind === 'user' ? owner.user.id : null
  const store = owner.kind === 'guest' ? owner.store : null
  const createGuestQueue = owner.kind === 'guest' ? owner.createQueue : null

  // Geração do jogo do visitante: sobe em "Jogar de novo" e ancora os salvamentos desta aba.
  const [generation, setGeneration] = useState(() =>
    owner.kind === 'guest' ? (owner.record?.game ?? 0) : 0,
  )

  const [summary, setSummary] = useState<ProgressSummary | null>(() => summaryOf(owner))

  // O estado inicial junta o progresso guardado e a fila local, uma única vez.
  const [source] = useState(() => initialSource(owner, puzzleId))

  const [state, dispatch] = useReducer(game.reducer, game.initialState, (start): GameState => {
    const opened = owner.kind === 'guest' ? owner.record : owner.progress
    if (opened?.status === 'completed') {
      return game.reducer(start, { type: 'viewServerProgress', cells: opened.cells })
    }
    // Ajudas ficam só neste aparelho: no registro do visitante, ou por conta e cruzada.
    const help =
      owner.kind === 'guest' ? (owner.record?.help ?? null) : loadHelp(owner.user.id, puzzleId)
    if (source.cells) return game.reducer(start, { type: 'hydrate', cells: source.cells, help })
    return help ? game.reducer(start, { type: 'hydrate', cells: start.cells, help }) : start
  })

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // Conta: cada mudança de ajuda vai para o aparelho (o visitante grava junto do progresso).
  const { usage, marks, locked } = state
  useEffect(() => {
    if (!userId) return
    const snapshot = helpOf({ usage, marks, locked })
    if (hasHelp(snapshot)) saveHelp(userId, puzzleId, snapshot)
  }, [usage, marks, locked, userId, puzzleId])

  // Configurações (feature 021): limites de ajuda e modo de riscar valem na hora; a modal aberta
  // suspende o relógio.
  const settings = useSettings()
  const settingsOpen = useSettingsOpen()
  const limits: GameLimits = useMemo(
    () => ({ letters: settings.helpLetters, words: settings.helpWords }),
    [settings.helpLetters, settings.helpWords],
  )
  const strikeMode: StrikeMode = settings.strikeMode
  const clock = useClock(source.elapsedMs, state.mode === 'playing', settingsOpen)
  const { readElapsedMs, stop: stopClock } = clock

  const queue: SaveQueue = useMemo(() => {
    if (store && createGuestQueue) {
      return createGuestQueue({
        puzzleId,
        date: puzzle.date,
        store,
        game: generation,
        onSaved: (record) => {
          setSummary(record)
          if (record.status === 'completed') dispatch({ type: 'confirmCompletion' })
        },
      })
    }
    return createSaveQueue({
      puzzleId,
      userId: userId ?? '',
      save: saveProgress,
      onProgress: (saved, body) => {
        if (saved) setSummary(saved)
        if (body.status === 'completed') dispatch({ type: 'confirmCompletion' })
      },
    })
  }, [puzzleId, puzzle.date, userId, store, createGuestQueue, generation, dispatch])
  const saveState = useSyncExternalStore(queue.subscribe, queue.getState, queue.getState)

  // O que vai para a fila. O visitante leva junto as ajudas atuais (R7); a conta não, porque o corpo
  // do servidor é estrito e as ajudas da conta ficam no `localStorage`.
  const snapshotOf = useCallback(
    (current: GameState, status: 'in_progress' | 'completed', elapsedMs: number) => {
      const base = { cells: current.cells, elapsedMs, status }
      if (!guest) return base
      const help = helpOf(current)
      return { ...base, help: hasHelp(help) ? help : null }
    },
    [guest],
  )

  // Letras novas vão para a fila de salvamento; o que veio guardado não. O visitante grava também
  // quando só as ajudas mudam (uma verificação que só marca células, FR-004).
  const savedCells = useRef(state.cells)
  const savedHelp = useRef({ usage: state.usage, marks: state.marks, locked: state.locked })
  useEffect(() => {
    if (state.mode !== 'playing') return
    const helpChanged =
      guest &&
      (state.usage !== savedHelp.current.usage ||
        state.marks !== savedHelp.current.marks ||
        state.locked !== savedHelp.current.locked)
    if (state.cells === savedCells.current && !helpChanged) return
    savedCells.current = state.cells
    savedHelp.current = { usage: state.usage, marks: state.marks, locked: state.locked }
    queue.schedule(snapshotOf(stateRef.current, 'in_progress', readElapsedMs()))
  }, [
    state.cells,
    state.usage,
    state.marks,
    state.locked,
    state.mode,
    guest,
    queue,
    readElapsedMs,
    snapshotOf,
  ])

  // Visitante: pausar também grava o tempo (R4).
  useEffect(() => {
    if (!guest || !clock.paused) return
    const current = stateRef.current
    if (current.mode !== 'playing') return
    queue.schedule(snapshotOf(current, 'in_progress', readElapsedMs()))
  }, [guest, clock.paused, queue, readElapsedMs, snapshotOf])

  // Ao sair da tela de jogo (navegação dentro do site), o que ainda estava esperando o debounce
  // sai agora; só depois os temporizadores são cancelados.
  useEffect(
    () => () => {
      const current = stateRef.current
      if (current.mode === 'playing' && current.cells.some((row) => row.some(Boolean))) {
        void queue.sendNow(snapshotOf(current, 'in_progress', readElapsedMs()), {
          keepalive: true,
        })
      }
      queue.dispose()
    },
    [queue, readElapsedMs, snapshotOf],
  )

  // Letras da fila local que ainda não chegaram ao servidor seguem na abertura.
  useEffect(() => {
    if (source.fromOutbox) void queue.retry()
  }, [source.fromOutbox, queue])

  // Grade certa: o relógio para e a conclusão sai na hora, com prioridade.
  useEffect(() => {
    if (state.completion !== 'pending') return
    stopClock()
    void queue.sendNow(snapshotOf(stateRef.current, 'completed', readElapsedMs()))
  }, [state.completion, state.cells, queue, readElapsedMs, stopClock, snapshotOf])

  // Outro aparelho concluiu: o jogo só avisa.
  useEffect(() => {
    if (saveState === 'completed-elsewhere') dispatch({ type: 'markElsewhere' })
  }, [saveState, dispatch])

  // Ao ocultar a aba ou sair da página, envia o que falta com `keepalive`.
  useEffect(() => {
    function leave() {
      const current = stateRef.current
      if (current.mode !== 'playing') return
      void queue.sendNow(snapshotOf(current, 'in_progress', readElapsedMs()), { keepalive: true })
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
  }, [queue, readElapsedMs, snapshotOf])

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

  // "Jogar de novo": a conta exige o servidor (ele guarda o melhor tempo); o visitante reinicia no
  // navegador, também sem conexão, mantendo o recorde.
  const playAgain = useCallback(async (): Promise<'ok' | 'offline' | 'error'> => {
    try {
      if (store) {
        const fresh = await store.reset(puzzleId)
        if (fresh) {
          setGeneration(fresh.game ?? 0)
          setSummary(fresh)
        }
      } else {
        const { progress: fresh } = await resetProgress(puzzleId)
        setSummary(fresh)
        if (userId) {
          clearHelp(userId, puzzleId)
          removeStorage(outboxKey(userId, puzzleId))
        }
      }
      savedCells.current = game.initialState.cells
      savedHelp.current = {
        usage: game.initialState.usage,
        marks: game.initialState.marks,
        locked: game.initialState.locked,
      }
      dispatch({ type: 'reset' })
      setCompletedHere(false)
      clock.restart()
      return 'ok'
    } catch (error) {
      return error instanceof ApiRequestError && error.isOffline ? 'offline' : 'error'
    }
  }, [puzzleId, userId, store, game, clock])

  // "Ver como ficou": só se a pessoa escolher, carrega o progresso concluído do servidor.
  const viewCompleted = useCallback(async (): Promise<boolean> => {
    if (store) return false
    try {
      const { progress: fresh } = await getProgress(puzzleId)
      if (!fresh || fresh.status !== 'completed') return false
      setSummary(fresh)
      stopClock()
      dispatch({ type: 'viewServerProgress', cells: fresh.cells })
      return true
    } catch {
      return false
    }
  }, [puzzleId, stopClock, store])

  // As ajudas usam os limites das configurações no momento do pedido.
  const send = useCallback(
    (action: GameAction) =>
      dispatch(
        action.type === 'revealLetter' || action.type === 'revealWord'
          ? { ...action, limits: action.limits ?? limits }
          : action,
      ),
    [limits],
  )
  const struck = useMemo(
    () => struckWords(game.index, state.cells, solution, strikeMode),
    [game.index, state.cells, solution, strikeMode],
  )

  return {
    game,
    state,
    dispatch: send,
    clock,
    queue,
    saveState,
    summary,
    completedHere,
    playAgain,
    viewCompleted,
    solved: isSolved(state.cells, solution),
    struck,
    strikeMode,
    limits,
  }
}
