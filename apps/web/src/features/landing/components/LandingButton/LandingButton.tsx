import styles from './LandingButton.module.css'

type LandingButtonOptions = {
  variant: 'primary' | 'quiet'
  size?: 'regular' | 'small'
}

// Botões da landing (feature 049): o amarelo com sombra deslocada e o só de borda do mockup. São só
// da landing; o `Button` do site, usado no resto, não muda. Servem a `Link`, `a` e `button`.
export function landingButtonClass({ variant, size = 'regular' }: LandingButtonOptions): string {
  return [styles.button, styles[variant], size === 'small' ? styles.small : '']
    .filter(Boolean)
    .join(' ')
}
