import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { feminineCount } from '../../helpers/count-words'
import styles from './FeatureCards.module.css'

const SOURCE_COUNT = puzzleSourceIdSchema.options.length

const SMALL_FEATURES = [
  { title: 'Modo lápis', text: 'Anote letras em rascunho antes de confirmar.' },
  { title: 'Atalhos de teclado', text: 'Setas, Tab e Home/End para jogar sem o mouse.' },
  { title: 'Tema claro e escuro', text: 'Segue o seu aparelho ou a sua escolha.' },
]

// Quantas fontes há vem da lista do jogo, então o cartão acompanha uma fonte nova ou removida.
export function FeatureCards() {
  const count = feminineCount(SOURCE_COUNT)
  const sourcesTitle = `${count.charAt(0).toUpperCase()}${count.slice(1)} ${
    SOURCE_COUNT === 1 ? 'fonte' : 'fontes'
  } de cruzadas`
  return (
    <section className={styles.section}>
      <div className={styles.cards}>
        <article className={styles.card}>
          <h2 className={styles.heading}>Jogue sem conta</h2>
          <p>Abra e jogue. Seu progresso fica salvo neste aparelho, sem cadastro.</p>
        </article>
        <article className={styles.card}>
          <h2 className={styles.heading}>{sourcesTitle}</h2>
          <p>Cruzadas de publicações diferentes, cada uma com o seu estilo e a sua dificuldade.</p>
        </article>
        <article className={styles.card}>
          <h2 className={styles.heading}>Funciona sem internet</h2>
          <p>Instale o site como aplicativo e abra as cruzadas que você já carregou.</p>
        </article>
      </div>
      <ul className={styles.small}>
        {SMALL_FEATURES.map((feature) => (
          <li key={feature.title}>
            <strong>{feature.title}</strong>
            <span>{feature.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
