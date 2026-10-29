import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { feminineCount } from '../../helpers/count-words'
import styles from './FeatureCards.module.css'

const SOURCE_COUNT = puzzleSourceIdSchema.options.length

const PILLS = [
  'Modo lápis para rascunhar',
  'Atalhos de teclado (tecle ?)',
  'Tema claro e escuro',
  'Tabuleiro que se ajusta à tela',
  'Cronômetro que pausa sozinho',
]

// "Como funciona" (feature 049, mockup): três cartões com ícone de cruzada e as pílulas dos recursos
// menores. A quantidade de fontes vem da lista do jogo, então o título acompanha uma fonte nova ou
// removida.
export function FeatureCards() {
  const count = feminineCount(SOURCE_COUNT)
  return (
    <section id="como" className={styles.section} aria-labelledby="como-titulo">
      <p className={styles.kicker}>Como funciona</p>
      <h2 id="como-titulo" className={styles.title}>
        Abriu, jogou. O resto é opcional.
      </h2>
      <div className={styles.cards}>
        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            1↓
          </span>
          <h3 className={styles.heading}>Sem conta para começar</h3>
          <p>
            Seu progresso fica guardado neste aparelho. Se quiser levar o jogo para outro lugar,
            crie uma conta depois.
          </p>
        </article>
        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            2→
          </span>
          <h3 className={styles.heading}>
            Uma cruzada por dia, de {count} {SOURCE_COUNT === 1 ? 'fonte' : 'fontes'}
          </h3>
          <p>
            A seção &quot;Hoje&quot; mostra uma cruzada de cada fonte e se você já começou, terminou
            ou ainda não tocou nela.
          </p>
        </article>
        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            3↓
          </span>
          <h3 className={styles.heading}>Funciona até sem internet</h3>
          <p>
            Instale o site como aplicativo e baixe a cruzada de hoje para jogar no ônibus, no avião,
            onde for.
          </p>
        </article>
      </div>
      <ul className={styles.pills} aria-label="Outros recursos">
        {PILLS.map((pill) => (
          <li key={pill} className={styles.pill}>
            {pill}
          </li>
        ))}
      </ul>
    </section>
  )
}
