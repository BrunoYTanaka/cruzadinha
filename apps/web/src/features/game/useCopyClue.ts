import type { Word } from '@cruzadinha/shared'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { clueCopyText } from '../../game-logic/clue-text'
import type { PuzzleIndex } from '../../game-logic/navigation'
import { useSettings } from '../settings/settings-store'

// Quanto o aviso de cópia fica na tela.
export const COPY_NOTICE_MS = 2500

export type CopyNotice = 'copied' | 'failed'

// O segundo clique do duplo clique seleciona uma palavra do texto da dica; com a cópia ligada isso
// é impedido (o primeiro clique segue selecionando a palavra do tabuleiro).
export function keepSelectionOnDoubleClick(event: MouseEvent): void {
  if (event.detail > 1) event.preventDefault()
}

type CopyClueArgs = {
  index: PuzzleIndex
  cells: (string | null)[][]
  // Com o jogo pausado a grade fica coberta; a lista de dicas não, então nada é copiado (FR-008).
  paused: boolean
}

// Cópia da dica com o tamanho e as letras já preenchidas (feature 033). `onCopy` é `undefined` com a
// opção desligada, para que nenhum handler seja ligado e o jogo siga como era.
export function useCopyClue({ index, cells, paused }: CopyClueArgs): {
  onCopy: ((word: Word) => void) | undefined
  notice: CopyNotice | null
} {
  const { copyClue } = useSettings()
  const [notice, setNotice] = useState<CopyNotice | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = useCallback((next: CopyNotice) => {
    window.clearTimeout(timer.current)
    setNotice(next)
    timer.current = window.setTimeout(() => setNotice(null), COPY_NOTICE_MS)
  }, [])

  const onCopy = useCallback(
    (word: Word) => {
      if (paused) return
      const text = clueCopyText(index, cells, word)
      // Contexto sem a API (página insegura) ou pedido recusado: o aviso de falha, sem travar o jogo.
      const write = navigator.clipboard?.writeText(text)
      if (!write) return show('failed')
      write.then(
        () => show('copied'),
        () => show('failed'),
      )
    },
    [index, cells, paused, show],
  )

  return { onCopy: copyClue ? onCopy : undefined, notice }
}
