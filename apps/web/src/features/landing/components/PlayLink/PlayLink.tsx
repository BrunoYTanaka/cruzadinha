import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { landingButtonClass } from '../LandingButton/LandingButton'

type PlayLinkProps = {
  to: string
  children: ReactNode
  variant?: 'primary' | 'quiet'
  size?: 'regular' | 'small'
  // Classe própria, para o link que não usa o botão da landing.
  className?: string
}

// Link da landing para uma tela que espera o servidor. Com o servidor dormindo, o `AppLayout` troca a
// landing pela tela de espera até o destino abrir (feature 063); o link em si não muda ao clique.
export function PlayLink({ to, children, variant, size, className }: PlayLinkProps) {
  const classes = [variant ? landingButtonClass({ variant, size }) : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  )
}
