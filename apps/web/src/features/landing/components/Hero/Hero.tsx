import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router'
import { feminineCount } from '../../helpers/count-words'
import { landingButtonClass } from '../LandingButton/LandingButton'
import styles from './Hero.module.css'

const TITLE = 'CRUZADINHA'
// Números das casas 1, 5 e 7 do título, como numa cruzada.
const NUMBERS: Record<number, number> = { 0: 1, 4: 2, 6: 3 }
const SOURCE_COUNT = feminineCount(puzzleSourceIdSchema.options.length)

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

// O topo da página (feature 049, mockup): o título cai letra a letra em dez casas numeradas e, abaixo
// dele, vêm a frase de destaque (o único `h1`), o texto de apoio e os dois botões. As casas, a grade
// do fundo e as letras soltas são decoração; o texto "Cruzadinha" do `h1` fica escondido na tela
// para leitor de tela e buscador.
export function Hero() {
  return (
    <section className={styles.hero}>
      <span className={`${styles.float} ${styles.f1}`} aria-hidden="true">
        Ç
      </span>
      <span className={`${styles.float} ${styles.f2}`} aria-hidden="true">
        A
      </span>
      <span className={`${styles.float} ${styles.f3}`} aria-hidden="true">
        É
      </span>
      <div className={styles.inner}>
        <div className={styles.title} aria-hidden="true">
          <div className={styles.cells}>
            {[...TITLE].map((letter, index) => (
              <span key={index} className={styles.cell} style={{ '--i': index } as CSSProperties}>
                {letter}
                {NUMBERS[index] ? <small>{NUMBERS[index]}</small> : null}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.copy}>
          <h1 className={styles.heading}>
            <span className={styles.text}>Cruzadinha: </span>
            Palavras cruzadas <em>todo dia</em>, sem cadastro e sem pressa.
          </h1>
          <div className={styles.side}>
            <p className={styles.lead}>
              O jogo abre direto no navegador. Escolha entre {SOURCE_COUNT} fontes de cruzadas,
              jogue no seu ritmo e continue de onde parou.
            </p>
            <div className={styles.actions}>
              <Link to="/jogar" className={landingButtonClass({ variant: 'primary' })}>
                Jogar a cruzada de hoje
              </Link>
              <a
                href="#mini-cruzada"
                className={landingButtonClass({ variant: 'quiet' })}
                onClick={scrollToMini}
              >
                Experimentar aqui
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
