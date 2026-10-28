import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../../../../shared/components/Button/Button'
import styles from './Hero.module.css'

const TITLE = 'CRUZADINHA'

// Rola até a mini cruzada: suave, ou direto com movimento reduzido. É código, e não
// `scroll-behavior: smooth` global, para não deixar suaves as outras rolagens do site. Sem JavaScript
// vale o próprio link de âncora.
function scrollToMini(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById('mini-cruzada')
  if (!target) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

// A página inteira é uma cruzada: o título cai letra a letra em casas (só com movimento permitido).
// O texto real do `h1` fica escondido na tela e lido pelo buscador e pelo leitor de tela; as casas
// são decoração.
export function Hero() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>
        <span className={styles.text}>Cruzadinha</span>
        <span className={styles.cells} aria-hidden="true">
          {[...TITLE].map((letter, index) => (
            <span
              key={index}
              className={`${styles.cell} ${index % 3 === 1 ? styles.lit : ''}`}
              style={{ '--i': index } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
      </h1>
      <p className={styles.lead}>
        Cruzadas em português para jogar no celular ou no computador, sem criar conta. Escolha a
        cruzada de hoje ou volte a um dia que você perdeu.
      </p>
      <div className={styles.actions}>
        <Link to="/jogar" className={buttonClass({ variant: 'primary' })}>
          Jogar a cruzada de hoje
        </Link>
        <a href="#mini-cruzada" className={styles.try} onClick={scrollToMini}>
          Experimentar aqui
        </a>
      </div>
    </section>
  )
}
