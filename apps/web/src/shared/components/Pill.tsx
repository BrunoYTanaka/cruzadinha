import type { ComponentPropsWithRef } from 'react'
import { buttonClass } from './Button'
import styles from './Pill.module.css'

// Botão secundário em forma de pílula (feature 023): cores e estados vêm do tipo.
export function Pill({ type = 'button', className, ...rest }: ComponentPropsWithRef<'button'>) {
  return (
    <button
      type={type}
      className={[buttonClass(), styles.pill, className ?? ''].join(' ').trim()}
      {...rest}
    />
  )
}
