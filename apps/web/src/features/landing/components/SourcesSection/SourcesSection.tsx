import { puzzleSourceIdSchema, puzzleSourceNames, type PuzzleSourceId } from '@cruzadinha/shared'
import { SOURCE_DESCRIPTIONS } from '../../helpers/source-descriptions'
import styles from './SourcesSection.module.css'

type SourcesSectionProps = {
  // Vem da lista do jogo; a prop existe para o teste mostrar que uma fonte nova entra sozinha.
  sources?: readonly PuzzleSourceId[]
}

export function SourcesSection({ sources = puzzleSourceIdSchema.options }: SourcesSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>De onde vêm as cruzadas</h2>
      <ul className={styles.list}>
        {sources.map((id) => (
          <li key={id} className={styles.item}>
            <h3 className={styles.name}>{puzzleSourceNames[id]}</h3>
            <p>{SOURCE_DESCRIPTIONS[id]}</p>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        As cruzadas pertencem às fontes; cada uma aparece no jogo com a atribuição de quem a
        publica.
      </p>
    </section>
  )
}
