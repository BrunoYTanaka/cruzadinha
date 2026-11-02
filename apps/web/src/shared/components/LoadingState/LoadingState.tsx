import { useEffect, useRef } from 'react'
import { useSlowAfter } from '../../hooks/useSlowAfter/useSlowAfter'
import { useSlowServer } from '../../hooks/useSlowServer/useSlowServer'
import { SlowNotice } from '../SlowNotice/SlowNotice'
import { CrosswordCells } from './CrosswordCells'
import { LOADING_SCREENS, type LoadingScreen } from './loading-screens'
import styles from './LoadingState.module.css'

type LoadingStateProps = {
  // Qual tela espera: define o título e a palavra das casas. Sem ela, a de entrada.
  screen?: LoadingScreen
  // 1 quando a espera é a página inteira (o título é o h1); 2 dentro de uma página que já tem h1;
  // sem nível o título é um parágrafo.
  level?: 1 | 2
  // Mostra a explicação, a barra e o contador já na montagem (ao tentar de novo depois do tempo
  // limite).
  immediate?: boolean
  // Leva o foco ao título quando a tela aparece (exige `level`).
  focusOnMount?: boolean
}

// A tela de espera única (feature 059). O título e as casas ficam fixos durante toda a espera; depois
// de 2 s, ou na hora com `immediate`, a explicação, a barra e o contador aparecem no espaço que já
// estava reservado, então nada se mexe.
export function LoadingState({
  screen = 'entry',
  level,
  immediate = false,
  focusOnMount = false,
}: LoadingStateProps) {
  const { title, word } = LOADING_SCREENS[screen]
  const server = useSlowServer()
  const local = useSlowAfter(true)
  const slow = immediate || server.slow || local.slow
  const elapsed = Math.max(server.elapsedSeconds, local.elapsedSeconds)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusOnMount) titleRef.current?.focus()
  }, [focusOnMount])

  const Title = level === 1 ? 'h1' : level === 2 ? 'h2' : 'p'
  return (
    <section className={styles.loading} aria-busy="true">
      <CrosswordCells word={word} />
      <Title
        className={styles.title}
        ref={titleRef}
        tabIndex={level ? -1 : undefined}
        role={level ? undefined : 'status'}
      >
        {title}
      </Title>
      <div className={styles.extra} data-show={slow}>
        <SlowNotice active={slow} />
        <div className={styles.progress} aria-hidden="true">
          <i />
        </div>
        <p className={styles.counter} aria-hidden="true">
          {elapsed} s esperando
        </p>
      </div>
    </section>
  )
}
