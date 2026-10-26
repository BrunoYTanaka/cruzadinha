import type { ComponentPropsWithoutRef } from 'react'
import styles from './VisuallyHidden.module.css'

// Texto só para leitores de tela.
export function VisuallyHidden({ className, ...rest }: ComponentPropsWithoutRef<'span'>) {
  return <span className={[styles.hidden, className ?? ''].join(' ').trim()} {...rest} />
}
