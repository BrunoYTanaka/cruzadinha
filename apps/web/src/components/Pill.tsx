import type { ComponentPropsWithRef } from 'react'
import styles from './Pill.module.css'

export function Pill({ type = 'button', className, ...rest }: ComponentPropsWithRef<'button'>) {
  return (
    <button type={type} className={[styles.pill, className ?? ''].join(' ').trim()} {...rest} />
  )
}
