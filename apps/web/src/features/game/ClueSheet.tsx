import type { Puzzle, Word } from '@cruzadinha/shared'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ClueList } from './ClueList'
import styles from './ClueSheet.module.css'

type ClueSheetProps = {
  open: boolean
  onClose: () => void
  puzzle: Puzzle
  activeWord: Word | null
  filled: ReadonlySet<string>
  onSelect: (word: Word) => void
}

// No celular a lista lateral não cabe: a tecla "Dicas" abre esta folha com todas as dicas.
export function ClueSheet({ open, onClose, puzzle, activeWord, filled, onSelect }: ClueSheetProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Dicas" align="bottom" closeOnBackdrop>
      <div className={styles.body}>
        <ClueList
          puzzle={puzzle}
          activeWord={activeWord}
          filled={filled}
          onSelect={(word) => {
            onSelect(word)
            onClose()
          }}
        />
      </div>
      <Button onClick={onClose}>Fechar</Button>
    </Dialog>
  )
}
