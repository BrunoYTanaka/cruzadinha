import { puzzleSourceNames, type PuzzleResponse, type Word } from '@cruzadinha/shared'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { activeWord } from '../../../../domain/game/navigation'
import { todayInBrasilia } from '../../../../shared/helpers/dates/dates'
import { buildLoginPath, SessionExpiredNotice } from '../../../session'
import { guestStore } from '../../../guest'
import {
  isNoPuzzle,
  isSourceDown,
  otherSourceShortcut,
  useSourceLibraries,
  rememberGameSource,
} from '../../../library'
import { boardKeyToAction } from '../../helpers/board-keys'
import { Board } from '../board/Board/Board'
import { ClueBar } from '../clues/ClueBar/ClueBar'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { ResizeHandle } from '../../../../shared/components/ResizeHandle/ResizeHandle'
import { cellFromDrag, KEYBOARD_STEP, MIN_CELL } from '../../services/board-size'
import { BoardSizeReset } from '../board/BoardSizeReset/BoardSizeReset'
import { CompletionDialog } from '../dialogs/CompletionDialog/CompletionDialog'
import { ReadModeBanner } from '../board/ReadModeBanner/ReadModeBanner'
import { ClueList } from '../clues/ClueList/ClueList'
import { ClueSheet } from '../clues/ClueSheet/ClueSheet'
import { CopyToast } from '../clues/CopyToast/CopyToast'
import { useCopyClue } from '../../hooks/useCopyClue'
import { formatDate } from '../../helpers/format-date'
import styles from './GameScreen.module.css'
import { HelpButtons } from '../controls/HelpButtons/HelpButtons'
import { Keyboard } from '../controls/Keyboard/Keyboard'
import { LegendButton } from '../controls/LegendButton/LegendButton'
import { PauseCover } from '../board/PauseCover/PauseCover'
import { SaveStatus } from '../controls/SaveStatus/SaveStatus'
import { Toolbar } from '../controls/Toolbar/Toolbar'
import { useBoardSize } from '../../hooks/useBoardSize'
import { useDesktopLayout } from '../../hooks/useDesktopLayout'
import { useGame, type GameOwner } from '../../hooks/useGame'
import { useOnScreenKeyboard } from '../../hooks/useOnScreenKeyboard'
import { attributionLine } from '../../helpers/attribution'
import { WordBar } from '../clues/WordBar/WordBar'

// Se o navegador deixou guardar o progresso do visitante (FR-009).
function useGuestStorageAvailable(): boolean {
  return useSyncExternalStore(guestStore.subscribe, guestStore.isAvailable, guestStore.isAvailable)
}

export function GameScreen({ response, owner }: { response: PuzzleResponse; owner: GameOwner }) {
  const { puzzle } = response
  const {
    game,
    state,
    dispatch,
    clock,
    queue,
    saveState,
    summary,
    completedHere,
    playAgain,
    viewCompleted,
    struck,
    strikeMode,
    limits,
  } = useGame({ response, owner })
  const guest = owner.kind === 'guest'
  const { onCopy, notice: copyNotice } = useCopyClue({
    index: game.index,
    cells: state.cells,
    paused: clock.paused,
  })
  const storageAvailable = useGuestStorageAvailable()
  const [dialogClosed, setDialogClosed] = useState(false)
  // A biblioteca das fontes só é pedida ao concluir, para o atalho da janela; em geral já está em
  // cache. Ela nunca mostra carregamento nem erro aqui (feature 015, FR-011).
  const libraries = useSourceLibraries({ enabled: completedHere })
  const otherSource = completedHere
    ? otherSourceShortcut(
        puzzle.source,
        puzzle.date,
        todayInBrasilia(),
        libraries.map((library) => ({ ...library, ready: library.query.isSuccess })),
        { isDown: isSourceDown, isNoPuzzle: (source) => isNoPuzzle(source, puzzle.date) },
      )
    : null
  const [playAgainError, setPlayAgainError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cluesOpen, setCluesOpen] = useState(false)
  const onScreenKeyboard = useOnScreenKeyboard()
  const desktop = useDesktopLayout()
  const bodyRef = useRef<HTMLDivElement>(null)
  const size = useBoardSize(bodyRef, {
    cols: puzzle.grid.width,
    rows: puzzle.grid.height,
    enabled: desktop,
  })
  const word = activeWord(game.index, state.selected, state.direction)
  const readOnly = state.mode !== 'playing'

  // Com o tabuleiro maior que a janela, a página rola o mínimo para mostrar a célula selecionada (o
  // foco fica na grade, então o navegador não rola sozinho).
  const selectedRow = state.selected?.row
  const selectedCol = state.selected?.col
  useEffect(() => {
    if (!desktop || selectedRow === undefined || selectedCol === undefined) return
    document
      .getElementById(`cell-${selectedRow}-${selectedCol}`)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [desktop, selectedRow, selectedCol])

  const gameSource = puzzle.source
  useEffect(() => rememberGameSource(gameSource), [gameSource])

  const confirmed = state.completion === 'confirmed'
  const finishedMs =
    summary?.status === 'completed' && summary.finishedMs !== null
      ? summary.finishedMs
      : clock.elapsedMs
  const bestMs = summary?.bestMs ?? null
  const isRecord = confirmed && bestMs !== null && summary?.finishedMs === bestMs

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

  // Anterior e próxima na barra acima do tabuleiro (computador); o foco volta ao tabuleiro.
  function stepWord(type: 'previousWord' | 'nextWord') {
    dispatch({ type })
    document.getElementById('board')?.focus()
  }

  const bar =
    state.mode === 'completed' ? (
      <ReadModeBanner elapsedMs={finishedMs} onPlayAgain={() => void onPlayAgain()} busy={busy} />
    ) : desktop ? (
      <ClueBar
        word={word}
        onPrevious={() => stepWord('previousWord')}
        onNext={() => stepWord('nextWord')}
        onCopy={onCopy}
      />
    ) : (
      <ClueBar word={word} onCopy={onCopy} />
    )
  const clueList = (
    <ClueList
      puzzle={puzzle}
      activeWord={word}
      struck={struck}
      strikeMode={strikeMode}
      onSelect={selectClue}
      onCopy={onCopy}
      fill={desktop}
    />
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
      <Toolbar
        title={
          <h1 className={styles.title}>
            <span className={styles.source}>{puzzleSourceNames[puzzle.source]}</span>{' '}
            <span className={styles.date}>
              <span className={styles.hidden}>Cruzada de </span>
              {formatDate(puzzle.date)}
            </span>
          </h1>
        }
        elapsedMs={clock.elapsedMs}
        paused={clock.paused}
        canPause={!readOnly}
        onPause={clock.pause}
        onResume={clock.resume}
        saveStatus={
          <SaveStatus
            state={saveState}
            guest={guest ? { loginTo: buildLoginPath(`/jogo/${response.puzzleId}`) } : undefined}
          />
        }
        sizeReset={size ? <BoardSizeReset isDefault={size.isDefault} onReset={size.reset} /> : null}
        helps={
          readOnly ? null : (
            <HelpButtons
              usage={state.usage}
              limits={limits}
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
        {guest ? null : <SessionExpiredNotice onSuccess={() => void queue.retry()} />}
        {guest && !storageAvailable ? (
          <Notice variant="warning">
            Seu navegador não deixou guardar o progresso. Ele vale só enquanto esta aba estiver
            aberta.
          </Notice>
        ) : null}
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
      <div ref={bodyRef} className={`${styles.body} ${desktop ? styles.desktop : ''}`}>
        <section className={styles.board} aria-label="Tabuleiro">
          {onScreenKeyboard || desktop ? bar : null}
          <div className={styles.boardWrap}>
            <div inert={clock.paused}>
              <Board
                id="board"
                puzzle={puzzle}
                index={game.index}
                state={state}
                readOnly={readOnly}
                focusOnMount={!readOnly}
                cellSize={size?.cellSize}
                onSelect={(position) => dispatch({ type: 'select', position })}
                onKey={(key) => dispatch(boardKeyToAction(key))}
              />
            </div>
            {clock.paused ? <PauseCover onResume={clock.resume} /> : null}
            {size && !clock.paused ? (
              <ResizeHandle
                className={styles.sizeHandle}
                variant="corner"
                label="Tamanho do tabuleiro"
                value={size.cellSize}
                min={MIN_CELL}
                max={size.max}
                step={KEYBOARD_STEP}
                valueText={(value) =>
                  `Tamanho do tabuleiro ${value} de ${size.max}${size.isDefault ? ', padrão' : ''}`
                }
                fromDrag={({ startValue, dx, dy }) =>
                  cellFromDrag({
                    startCell: startValue,
                    dx,
                    dy,
                    cols: puzzle.grid.width,
                    rows: puzzle.grid.height,
                  })
                }
                onChange={size.preview}
                onCommit={size.commit}
                onReset={size.reset}
                // Depois de arrastar com o mouse, as letras digitadas voltam a ir para o tabuleiro.
                onDragEnd={() => document.getElementById('board')?.focus()}
              />
            ) : null}
          </div>
          {onScreenKeyboard ? (
            <WordBar word={word} index={game.index} cells={state.cells} selected={state.selected} />
          ) : null}
          {onScreenKeyboard ? (
            <p className={styles.attribution}>{attributionLine(puzzle)}</p>
          ) : null}
        </section>
        {onScreenKeyboard ? null : desktop ? (
          // Computador: tabuleiro e dicas formam um bloco centralizado. As dicas acompanham a altura
          // do tabuleiro e ficam fixas ao lado quando a página rola.
          <aside className={styles.clues} aria-label="Dicas">
            <div className={styles.cluesInner}>
              {clueList}
              <p className={styles.attribution}>{attributionLine(puzzle)}</p>
            </div>
          </aside>
        ) : (
          <aside className={styles.clues} aria-label="Dicas">
            {bar}
            {clueList}
            <p className={styles.attribution}>{attributionLine(puzzle)}</p>
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
        localOnly={guest}
        otherSource={otherSource}
      />
      <LegendButton />
      <CopyToast notice={copyNotice} />
      <ClueSheet
        open={cluesOpen}
        onClose={() => setCluesOpen(false)}
        puzzle={puzzle}
        activeWord={word}
        struck={struck}
        strikeMode={strikeMode}
        onSelect={selectClue}
      />
    </div>
  )
}
