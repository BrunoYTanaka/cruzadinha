import {
  useReducer,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Link } from 'react-router'
import { Button, buttonClass } from '../../../../shared/components/Button/Button'
import { activeWord } from '../../../../domain/game/navigation'
import { cellKey } from '../../../../domain/game/state'
import { createGame, type GameAction } from '../../../../domain/game/reducer'
import { SAMPLE_PUZZLE, SAMPLE_SOLUTION } from '../../helpers/sample'
import styles from './MiniCrossword.module.css'

// Sem limite de ajuda: a mini cruzada não tem ajudas, relógio nem progresso (feature 048, FR-009).
const game = createGame({
  puzzle: SAMPLE_PUZZLE,
  solution: SAMPLE_SOLUTION,
  limits: { letters: null, words: null },
})

// O campo escondido guarda este caractere para o Backspace do teclado do celular gerar um evento
// mesmo com nenhuma letra digitada.
const SENTINEL = '​'

const cellId = (row: number, col: number) => `mini-cruzada-${row}-${col}`

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
      // Tab não é tratado: a mini cruzada não prende o foco do teclado.
      return key.length === 1 ? { type: 'type', key } : null
  }
}

// Mini cruzada jogável da landing: o estado e as regras são os do jogo (`domain/game`), mas nada é
// salvo nem enviado, e não há relógio.
export function MiniCrossword() {
  const [state, dispatch] = useReducer(game.reducer, game.initialState)
  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const word = activeWord(game.index, state.selected, state.direction)
  const inWord = new Set(word ? game.index.cellsOf(word).map((cell) => cellKey(cell)) : [])
  const selectedKey = state.selected ? cellKey(state.selected) : null
  const done = state.mode === 'completed'

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (done || event.ctrlKey || event.altKey || event.metaKey) return
    const action = keyAction(event)
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

  return (
    <section id="mini-cruzada" className={styles.section} aria-labelledby="mini-cruzada-titulo">
      <h2 id="mini-cruzada-titulo" className={styles.heading}>
        Experimente aqui
      </h2>
      <p className={styles.help}>
        Toque ou clique numa casa e digite. Toque de novo na mesma casa para trocar entre horizontal
        e vertical.
      </p>
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
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div
                  key={col}
                  id={cellId(row, col)}
                  role="gridcell"
                  aria-selected={key === selectedKey}
                  aria-label={letter ? `Linha ${row + 1}, coluna ${col + 1}: ${letter}` : undefined}
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
      {done ? (
        <div className={styles.done} role="status">
          <p>Você completou a mini cruzada!</p>
          <div className={styles.actions}>
            <Link to="/jogar" className={buttonClass({ variant: 'primary' })}>
              Jogar a cruzada de hoje
            </Link>
            <Button variant="secondary" onClick={() => dispatch({ type: 'reset' })}>
              Jogar de novo
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.footer}>
          <p className={styles.clue} aria-live="polite">
            {word
              ? `${word.number} ${word.direction === 'across' ? 'horizontal' : 'vertical'}: ${word.clue}`
              : 'Escolha uma casa.'}
          </p>
          <Button variant="quiet" size="small" onClick={() => dispatch({ type: 'reset' })}>
            Limpar
          </Button>
        </div>
      )}
    </section>
  )
}
