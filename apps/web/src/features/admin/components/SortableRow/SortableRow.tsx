import { useSortable } from '@dnd-kit/react/sortable'
import type { KeyboardEventHandler, ReactNode } from 'react'
import { DragHandle } from '../DragHandle/DragHandle'
import styles from './SortableRow.module.css'

type SortableRowProps = {
  id: string
  index: number
  name: string
  describedBy: string
  grabbed: boolean
  // Fonte escondida: contorno cinza.
  dimmed?: boolean
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>
  onBlur: () => void
  children: ReactNode
}

// Linha da lista de fontes: o dnd-kit só arrasta pela alça. Levantada, ganha contorno escuro e
// sombra suave; como destino, uma faixa amarela de 4 px.
export function SortableRow({
  id,
  index,
  name,
  describedBy,
  grabbed,
  dimmed = false,
  onKeyDown,
  onBlur,
  children,
}: SortableRowProps) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({ id, index })
  const classes = [
    styles.row,
    isDragging || grabbed ? styles.lifted : '',
    isDropTarget ? styles.target : '',
    dimmed ? styles.dimmed : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <li ref={ref} className={classes}>
      <DragHandle
        ref={handleRef}
        label={`Arrastar ${name}`}
        describedBy={describedBy}
        grabbed={grabbed}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <span className={styles.position} aria-hidden="true">
        {index + 1}
      </span>
      {children}
    </li>
  )
}
