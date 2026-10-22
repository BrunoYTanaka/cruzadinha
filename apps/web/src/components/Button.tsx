import type { ComponentPropsWithRef } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'icon'
export type ButtonSize = 'regular' | 'small'

type ButtonClassOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

// Classes de um tipo de botão, também para links e botões com classe própria (feature 023). A classe
// do componente vem depois e muda só medidas e forma, nunca cores nem estados.
export function buttonClass({
  variant = 'secondary',
  size = 'regular',
  block = false,
}: ButtonClassOptions = {}): string {
  return [
    styles.button,
    styles[variant],
    size === 'small' ? styles.small : '',
    block ? styles.block : '',
  ]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = ComponentPropsWithRef<'button'> & ButtonClassOptions

export function Button({ variant, size, block, type = 'button', className, ...rest }: ButtonProps) {
  const classes = [buttonClass({ variant, size, block }), className ?? ''].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
