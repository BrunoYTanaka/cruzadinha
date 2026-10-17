import { puzzleSourceIdSchema, puzzleSourceNames, type PuzzleSourceId } from '@cruzadinha/shared'
import { Button } from '../../components/Button'
import styles from './SourcePicker.module.css'

type SourcePickerProps = {
  value: PuzzleSourceId
  onChange: (source: PuzzleSourceId) => void
}

// Duas opções visíveis deixam claro qual fonte está ativa; o ativo também aparece por
// `aria-pressed`, não só pela cor (feature 014).
export function SourcePicker({ value, onChange }: SourcePickerProps) {
  return (
    <div role="group" aria-label="Fonte da cruzada" className={styles.picker}>
      {puzzleSourceIdSchema.options.map((source) => (
        <Button
          key={source}
          variant={source === value ? 'primary' : 'default'}
          aria-pressed={source === value}
          onClick={() => onChange(source)}
        >
          {puzzleSourceNames[source]}
        </Button>
      ))}
    </div>
  )
}
