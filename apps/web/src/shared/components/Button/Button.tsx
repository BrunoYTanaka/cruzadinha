import { useLayoutEffect, useRef, useState, type ComponentPropsWithRef } from 'react'
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

type ButtonProps = ComponentPropsWithRef<'button'> &
  ButtonClassOptions & {
    // Pedido em andamento (feature 059): desabilita, marca `aria-busy`, mostra um indicador e segura a
    // largura que o botão tinha, para o texto de "em andamento" não encolhê-lo.
    pending?: boolean
  }

export function Button({
  variant,
  size,
  block,
  pending = false,
  type = 'button',
  className,
  ref,
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const element = useRef<HTMLButtonElement | null>(null)
  const [idleWidth, setIdleWidth] = useState<number>()
  const classes = [buttonClass({ variant, size, block }), className ?? ''].filter(Boolean).join(' ')

  // Guarda a largura do botão em repouso; ao entrar em `pending` ela vira a largura mínima.
  useLayoutEffect(() => {
    if (!pending && element.current) setIdleWidth(element.current.offsetWidth)
    // Roda a cada renderização em repouso: o texto pode mudar a largura. Um valor igual não renderiza
    // de novo.
  }, [pending, children, variant, size, block])

  function setRef(node: HTMLButtonElement | null) {
    element.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  return (
    <button
      type={type}
      className={classes}
      ref={setRef}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      style={pending && idleWidth ? { minWidth: idleWidth, ...style } : style}
      {...rest}
    >
      {pending ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
