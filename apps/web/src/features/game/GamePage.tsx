import type { Puzzle, Word } from '@cruzadinha/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { getProgress } from '../../api/progress'
import { getPuzzleById } from '../../api/puzzles'
import { queryKeys } from '../../api/query-keys'
import { ErrorState, LoadingState } from '../../app/ErrorState'
import { config } from '../../config'
import { activeWord } from '../../game-logic/navigation'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useSessionQuery } from '../auth/useSession'
import { SessionExpiredNotice } from '../auth/SessionExpiredNotice'
import { boardKeyToAction } from './board-keys'
import { Board } from './Board'
import { ClueBar } from './ClueBar'
import { Notice } from '../../components/Notice'
import { CompletionDialog } from './CompletionDialog'
import { ReadModeBanner } from './ReadModeBanner'
import { ClueList, wordKey } from './ClueList'
import { ClueSheet } from './ClueSheet'
import styles from './GamePage.module.css'
import { HelpButtons } from './HelpButtons'
import { Keyboard } from './Keyboard'
import { LegendButton } from './LegendButton'
import { PauseCover } from './PauseCover'
import { SaveStatus } from './SaveStatus'
import { Toolbar } from './Toolbar'
import { useGame } from './useGame'
import { useOnScreenKeyboard } from './useOnScreenKeyboard'
import { WordBar } from './WordBar'
import type { PuzzleResponse, Progress, User } from '@cruzadinha/shared'

function BackLink() {
  return <Link to="/">Voltar à biblioteca</Link>
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)))
}

function attribution(puzzle: Puzzle): string {
  const { sourceName, title, author, copyright } = puzzle.attribution
  return ['Fonte: ' + sourceName, title, author, copyright].filter(Boolean).join(' · ')
}

// Carrega a cruzada e o progresso em paralelo. Depois de carregado, nenhum erro tira o tabuleiro
// da tela (FR-032): falhas viram avisos que não bloqueiam.
export function GamePage() {
  const { puzzleId = '' } = useParams()
  const session = useSessionQuery()
  const puzzleQuery = useQuery({
    queryKey: queryKeys.puzzle(puzzleId),
    queryFn: () => getPuzzleById(puzzleId),
    retry: false,
    refetchOnWindowFocus: false,
  })
  // O progresso é sempre buscado de novo ao abrir, e nunca recarregado por baixo do jogo.
  const progressQuery = useQuery({
    queryKey: queryKeys.progress(puzzleId),
    queryFn: () => getProgress(puzzleId),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  useDocumentTitle(
    puzzleQuery.data ? `Cruzada de ${formatDate(puzzleQuery.data.puzzle.date)}` : 'Cruzada',
  )

  const failure = puzzleQuery.error ?? progressQuery.error
  if (failure) {
    if (failure instanceof ApiRequestError && failure.status === 404) {
      return (
        <ErrorState title="Cruzada não encontrada.">
          <BackLink />
        </ErrorState>
      )
    }
    const offline = failure instanceof ApiRequestError && failure.isOffline
    return (
      <ErrorState
        title={offline ? 'Sem conexão' : 'Não foi possível abrir a cruzada'}
        message={offline ? 'Confira a conexão e tente de novo.' : 'Tente de novo em instantes.'}
        onRetry={() => {
          void puzzleQuery.refetch()
          void progressQuery.refetch()
        }}
      >
        <BackLink />
      </ErrorState>
    )
  }
  if (!puzzleQuery.data || !progressQuery.data || !session.data) {
    return <LoadingState label="Carregando a cruzada…" />
  }
  return (
    <Game
      key={puzzleId}
      response={puzzleQuery.data}
      progress={progressQuery.data.progress}
      user={session.data.user}
    />
  )
}

function Game({
  response,
  progress,
  user,
}: {
  response: PuzzleResponse
  progress: Progress | null
  user: User
}) {
  const { puzzle } = response
  const {
    game,
    state,
    dispatch,
    clock,
    queue,
    saveState,
    serverProgress,
    completedHere,
    playAgain,
    viewCompleted,
  } = useGame({ response, progress, user })
  const [dialogClosed, setDialogClosed] = useState(false)
  const [playAgainError, setPlayAgainError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cluesOpen, setCluesOpen] = useState(false)
  const onScreenKeyboard = useOnScreenKeyboard()
  const word = activeWord(game.index, state.selected, state.direction)
  const readOnly = state.mode !== 'playing'

  const filled = useMemo(() => {
    const done = new Set<string>()
    for (const item of puzzle.words) {
      if (game.index.cellsOf(item).every((cell) => state.cells[cell.row]?.[cell.col] != null)) {
        done.add(wordKey(item))
      }
    }
    return done
  }, [puzzle.words, game.index, state.cells])

  const confirmed = state.completion === 'confirmed'
  const finishedMs =
    serverProgress?.status === 'completed' && serverProgress.finishedMs !== null
      ? serverProgress.finishedMs
      : clock.elapsedMs
  const bestMs = serverProgress?.bestMs ?? null
  const isRecord = confirmed && bestMs !== null && serverProgress?.finishedMs === bestMs

  async function onPlayAgain() {
    setBusy(true)
    setPlayAgainError(null)
    const result = await playAgain()
    setBusy(false)
    if (result === 'ok') setDialogClosed(false)
    else if (result === 'offline') setPlayAgainError('Sem conexão. Tente de novo quando voltar.')
    else setPlayAgainError('Não foi possível reiniciar. Tente de novo.')
  }

  async function onViewElsewhere() {
    await viewCompleted()
  }

  // Depois de usar uma ajuda o foco volta ao tabuleiro, para seguir digitando.
  function help(type: 'revealLetter' | 'revealWord' | 'verify') {
    dispatch({ type })
    document.getElementById('board')?.focus()
  }

  function selectClue(item: Word) {
    dispatch({ type: 'selectWord', number: item.number, direction: item.direction })
    document.getElementById('board')?.focus()
  }

  const bar =
    state.mode === 'completed' ? (
      <ReadModeBanner elapsedMs={finishedMs} onPlayAgain={() => void onPlayAgain()} busy={busy} />
    ) : (
      <ClueBar word={word} />
    )

  return (
    <div
      className={styles.page}
      style={
        {
          '--keyboard-space': onScreenKeyboard && !readOnly ? '200px' : '0px',
        } as React.CSSProperties
      }
    >
      <h1 className={styles.title}>Cruzada de {formatDate(puzzle.date)}</h1>
      <Toolbar
        elapsedMs={clock.elapsedMs}
        paused={clock.paused}
        canPause={!readOnly}
        onPause={clock.pause}
        onResume={clock.resume}
        saveStatus={<SaveStatus state={saveState} />}
        helps={
          readOnly ? null : (
            <HelpButtons
              usage={state.usage}
              limits={config.helpLimits}
              lastHelp={state.lastHelp}
              disabled={clock.paused}
              onLetter={() => help('revealLetter')}
              onWord={() => help('revealWord')}
              onVerify={() => help('verify')}
            />
          )
        }
      />
      <div className={styles.notices}>
        <SessionExpiredNotice onSuccess={() => void queue.retry()} />
        {state.elsewhere ? (
          <Notice
            variant="info"
            action={{ label: 'Ver como ficou', onClick: () => void onViewElsewhere() }}
          >
            Esta cruzada já foi concluída em outro aparelho.
          </Notice>
        ) : null}
        {playAgainError ? <Notice variant="error">{playAgainError}</Notice> : null}
      </div>
      <div className={styles.body}>
        <section className={styles.board} aria-label="Tabuleiro">
          {onScreenKeyboard ? bar : null}
          <div className={styles.boardWrap}>
            <div inert={clock.paused}>
              <Board
                id="board"
                puzzle={puzzle}
                index={game.index}
                state={state}
                readOnly={readOnly}
                focusOnMount={!readOnly}
                onSelect={(position) => dispatch({ type: 'select', position })}
                onKey={(key) => dispatch(boardKeyToAction(key))}
              />
            </div>
            {clock.paused ? <PauseCover onResume={clock.resume} /> : null}
          </div>
          {onScreenKeyboard ? (
            <WordBar word={word} index={game.index} cells={state.cells} selected={state.selected} />
          ) : null}
          {onScreenKeyboard ? <p className={styles.attribution}>{attribution(puzzle)}</p> : null}
        </section>
        {onScreenKeyboard ? null : (
          // No computador o tabuleiro fica sozinho na coluna da esquerda e ocupa o máximo de espaço;
          // a dica ativa, a lista e a fonte ficam na coluna ao lado.
          <aside className={styles.clues} aria-label="Dicas">
            {bar}
            <ClueList puzzle={puzzle} activeWord={word} filled={filled} onSelect={selectClue} />
            <p className={styles.attribution}>{attribution(puzzle)}</p>
          </aside>
        )}
      </div>
      {onScreenKeyboard && !readOnly ? (
        <Keyboard
          onLetter={(letter) => dispatch({ type: 'type', key: letter })}
          onBackspace={() => dispatch({ type: 'backspace' })}
          onClues={() => setCluesOpen(true)}
        />
      ) : null}
      <CompletionDialog
        open={completedHere && !dialogClosed}
        onViewBoard={() => setDialogClosed(true)}
        elapsedMs={finishedMs}
        bestMs={bestMs}
        confirmed={confirmed}
        helpsUsed={state.usage.letters + state.usage.words}
        isRecord={isRecord}
      />
      <LegendButton />
      <ClueSheet
        open={cluesOpen}
        onClose={() => setCluesOpen(false)}
        puzzle={puzzle}
        activeWord={word}
        filled={filled}
        onSelect={selectClue}
      />
    </div>
  )
}
