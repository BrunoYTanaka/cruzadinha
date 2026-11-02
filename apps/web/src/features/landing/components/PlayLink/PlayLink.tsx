import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SLOW_MESSAGE } from '../../../../shared/components/LoadingState/loading-screens'
import { useSlowAfter } from '../../../../shared/hooks/useSlowAfter/useSlowAfter'
import { landingButtonClass } from '../LandingButton/LandingButton'
import styles from './PlayLink.module.css'

type PlayLinkProps = {
  to: string
  children: ReactNode
  variant?: 'primary' | 'quiet'
  size?: 'regular' | 'small'
  // Classe própria, para o link que não usa o botão da landing.
  className?: string
  pendingLabel?: string
}

// Link da landing para uma tela que espera o servidor (feature 059). Ao clique reage na hora com
// "Abrindo…" e, se a espera passar de 2 s, explica a demora num balão logo abaixo, fora do fluxo, para
// nada se mover. O estado é local ao clique (e não `useNavigation`) porque o prerender renderiza a
// landing num `StaticRouter`, que não é um roteador de dados.
export function PlayLink({
  to,
  children,
  variant,
  size,
  className,
  pendingLabel = 'Abrindo…',
}: PlayLinkProps) {
  const [pending, setPending] = useState(false)
  const [width, setWidth] = useState<number>()
  const linkRef = useRef<HTMLAnchorElement>(null)
  const { slow } = useSlowAfter(pending)

  // Voltar durante a espera cancela a navegação: o botão não pode ficar preso em "Abrindo…".
  useEffect(() => {
    if (!pending) return
    const release = () => setPending(false)
    window.addEventListener('popstate', release)
    return () => window.removeEventListener('popstate', release)
  }, [pending])

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (pending) {
      // O `Link` só navega se o clique não foi cancelado.
      event.preventDefault()
      return
    }
    setWidth(linkRef.current?.offsetWidth)
    setPending(true)
  }

  const classes = [variant ? landingButtonClass({ variant, size }) : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <span className={styles.wrap}>
      <Link
        ref={linkRef}
        to={to}
        className={classes}
        aria-busy={pending || undefined}
        style={pending && width ? { minWidth: width } : undefined}
        onClick={onClick}
      >
        {pending ? pendingLabel : children}
      </Link>
      {pending ? (
        // A região nasce no clique e o texto entra 2 s depois, para o leitor de tela anunciá-lo.
        <span className={`${styles.notice} ${slow ? styles.shown : ''}`} role="status">
          {slow ? SLOW_MESSAGE : null}
        </span>
      ) : null}
    </span>
  )
}
