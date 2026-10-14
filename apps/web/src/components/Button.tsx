import type { ComponentPropsWithRef } from 'react'
import styles from './Button.module.css'

type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'default' | 'primary' | 'ghost'
  block?: boolean
}

export function Button({
  variant = 'default',
  block = false,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={classes} {...rest} />
}
