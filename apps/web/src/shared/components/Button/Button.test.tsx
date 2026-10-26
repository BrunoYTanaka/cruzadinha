import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, buttonClass, type ButtonVariant } from './Button'
import styles from './Button.module.css'

const classesOf = (value: string) => value.split(' ').filter(Boolean)

describe('buttonClass', () => {
  it('sem opções é o botão secundário', () => {
    expect(classesOf(buttonClass())).toEqual([styles.button, styles.secondary])
  })

  it.each<ButtonVariant>(['primary', 'secondary', 'quiet', 'icon'])(
    'a variante %s gera a sua classe',
    (variant) => {
      const classes = classesOf(buttonClass({ variant }))
      expect(classes).toContain(styles.button)
      expect(classes).toContain(styles[variant])
    },
  )

  it('acrescenta o tamanho pequeno e a largura total', () => {
    const classes = classesOf(buttonClass({ size: 'small', block: true }))
    expect(classes).toContain(styles.small)
    expect(classes).toContain(styles.block)
  })
})

describe('Button', () => {
  it('é type="button" por padrão e põe a classe extra depois das do tipo', () => {
    render(
      <Button variant="quiet" className="extra">
        Restaurar padrões
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Restaurar padrões' })
    expect(button).toHaveAttribute('type', 'button')
    expect(classesOf(button.className)).toEqual([styles.button, styles.quiet, 'extra'])
  })
})
