import {
  useReducer,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Link } from 'react-router'
import { activeWord } from '../../../../domain/game/navigation'
import { cellKey, type Direction } from '../../../../domain/game/state'
import type { GameAction } from '../../../../domain/game/reducer'
import { miniGame, miniReducer, solvedWords, START_STATE } from '../../helpers/mini-state'
import { SAMPLE_PUZZLE } from '../../helpers/sample'
import { landingButtonClass } from '../LandingButton/LandingButton'
import styles from './MiniCrossword.module.css'

// O campo escondido guarda este caractere para o Backspace do teclado do celular gerar um evento
// mesmo com nenhuma letra digitada.
const SENTINEL = '​'

const cellId = (row: number, col: number) => `mini-cruzada-${row}-${col}`

const DIRECTIONS: { direction: Direction; title: string }[] = [
  { direction: 'across', title: 'Horizontais' },
  { direction: 'down', title: 'Verticais' },
]

function keyAction(event: KeyboardEvent): GameAction | null {
  const { key } = event
  switch (key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      return { type: 'move', arrow: key }
    case 'Backspace':
      return { type: 'backspace' }
    case 'Delete':
      return { type: 'delete' }
    case 'Home':
      return { type: 'wordStart' }
    case 'End':
      return { type: 'wordEnd' }
    default:
      return key.length === 1 ? { type: 'type', key } : null
  }
}

// Mini cruzada jogável da landing (features 048 e 049): o estado e as regras são os do jogo
// (`domain/game`), mas nada é salvo nem enviado, e não há relógio.
export function MiniCrossword() {
  const [state, dispatch] = useReducer(miniReducer, START_STATE)
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const { words } = miniGame.index
  const word = activeWord(miniGame.index, state.selected, state.direction)
  const inWord = new Set(word ? miniGame.index.cellsOf(word).map((cell) => cellKey(cell)) : [])
  const selectedKey = state.selected ? cellKey(state.selected) : null
  const solved = solvedWords(state)
  const isSolved = (number: number, direction: Direction) =>
    solved.some((item) => item.number === number && item.direction === direction)
  const solvedCells = new Set(
    words
      .filter((item) => isSolved(item.number, item.direction))
      .flatMap((item) => miniGame.index.cellsOf(item).map((cell) => cellKey(cell))),
  )
  const done = state.mode === 'completed'

  // Tab anda entre as palavras, mas na última (e Shift+Tab na primeira) deixa a grade: o teclado
  // nunca fica preso nela.
  function tabAction(event: KeyboardEvent): GameAction | null {
    const at = word
      ? words.findIndex((item) => item.number === word.number && item.direction === word.direction)
      : -1
    if (event.shiftKey ? at === 0 : at === words.length - 1) return null
    return { type: event.shiftKey ? 'previousWord' : 'nextWord' }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (done || event.ctrlKey || event.altKey || event.metaKey) return
    const action = event.key === 'Tab' ? tabAction(event) : keyAction(event)
    if (!action) return
    event.preventDefault()
    dispatch(action)
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (done || !(event.target instanceof Element)) return
    const target = event.target.closest<HTMLElement>('[data-row]')
    if (!target) return
    const position = { row: Number(target.dataset.row), col: Number(target.dataset.col) }
    const again = cellKey(position) === selectedKey
    dispatch(again ? { type: 'toggleDirection' } : { type: 'select', position })
    gridRef.current?.focus()
  }

  // No celular o teclado da tela só abre com um campo de texto em foco.
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' && !done) {
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
  }

  function onInput(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const inputType = (event.nativeEvent as InputEvent).inputType
    if (inputType === 'deleteContentBackward') {
      dispatch({ type: 'backspace' })
    } else {
      for (const letter of input.value.replace(SENTINEL, '')) {
        dispatch({ type: 'type', key: letter })
      }
    }
    input.value = SENTINEL
  }

  function selectClue(number: number, direction: Direction) {
    if (done) return
    dispatch({ type: 'selectWord', number, direction })
    gridRef.current?.focus()
  }

  return (
    <section id="mini-cruzada" className={styles.section} aria-labelledby="mini-cruzada-titulo">
      <p className={styles.kicker}>Experimente</p>
      <h2 id="mini-cruzada-titulo" className={styles.title}>
        Uma mini cruzada, bem aqui.
      </h2>
      <div className={styles.play}>
        <div className={styles.box}>
          <div
            ref={gridRef}
            role="grid"
            aria-label="Mini cruzada 5 por 5"
            aria-activedescendant={
              state.selected ? cellId(state.selected.row, state.selected.col) : undefined
            }
            aria-readonly={done || undefined}
            tabIndex={done ? -1 : 0}
            className={styles.grid}
            onKeyDown={onKeyDown}
            onClick={onClick}
            onPointerDown={onPointerDown}
          >
            {SAMPLE_PUZZLE.grid.cells.map((line, row) => (
              <div role="row" key={row} className={styles.row}>
                {line.map((cell, col) => {
                  if (cell.kind === 'block') {
                    return <div key={col} role="presentation" className={styles.block} />
                  }
                  const key = cellKey({ row, col })
                  const letter = state.cells[row]?.[col] ?? ''
                  const classes = [
                    styles.cell,
                    inWord.has(key) ? styles.word : '',
                    key === selectedKey ? styles.selected : '',
                    solvedCells.has(key) ? styles.ok : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <div
                      key={col}
                      id={cellId(row, col)}
                      role="gridcell"
                      aria-selected={key === selectedKey}
                      aria-label={
                        letter ? `Linha ${row + 1}, coluna ${col + 1}: ${letter}` : undefined
                      }
                      data-row={row}
                      data-col={col}
                      className={classes}
                    >
                      {cell.number ? <span className={styles.number}>{cell.number}</span> : null}
                      <span aria-hidden={letter ? undefined : true}>{letter}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <input
            ref={inputRef}
            className={styles.sink}
            aria-label="Letras da mini cruzada"
            tabIndex={-1}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            defaultValue={SENTINEL}
            onInput={onInput}
            onKeyDown={onKeyDown}
          />
          <div className={styles.foot}>
            <p
              className={`${styles.status} ${done ? styles.win : ''}`}
              role="status"
              aria-live="polite"
            >
              {done
                ? 'Resolvida! Amanhã tem outra.'
                : `${solved.length} de ${words.length} palavras certas.`}
            </p>
            <div className={styles.actions}>
              {done ? (
                <Link
                  to="/jogar"
                  className={landingButtonClass({ variant: 'primary', size: 'small' })}
                >
                  Jogar a cruzada de hoje
                </Link>
              ) : null}
              <button
                type="button"
                className={landingButtonClass({ variant: 'quiet', size: 'small' })}
                onClick={() => dispatch('clear')}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
        <div className={styles.clues}>
          {DIRECTIONS.map(({ direction, title }) => (
            <div key={direction}>
              <h3 className={styles.cluesTitle}>{title}</h3>
              <ul className={styles.list}>
                {words
                  .filter((item) => item.direction === direction)
                  .map((item) => {
                    const on = word?.number === item.number && word.direction === direction
                    const ok = isSolved(item.number, direction)
                    return (
                      <li key={item.number} className={on ? styles.on : ''}>
                        <button
                          type="button"
                          className={`${styles.clue} ${ok ? styles.solved : ''}`}
                          aria-current={on || undefined}
                          onClick={() => selectClue(item.number, direction)}
                        >
                          <b>{item.number}</b>
                          <span>
                            {item.clue} ({item.length})
                          </span>
                          {ok ? <span className={styles.sr}>resolvida</span> : null}
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
          ))}
          <p className={styles.hint}>
            Clique de novo na mesma casa para trocar de direção. Setas andam pelo tabuleiro. As
            dicas são só desta amostra.
          </p>
        </div>
      </div>
    </section>
  )
}
