import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

  it('com pending desabilita, marca aria-busy e mostra o indicador, sem mexer na leitura', () => {
    const { rerender } = render(<Button variant="primary">Entrar</Button>)
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toHaveAttribute('aria-busy')
    rerender(
      <Button variant="primary" pending>
        Entrando…
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Entrando…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('segura a largura que tinha em repouso ao entrar em pending', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    const { rerender } = render(<Button>Criar conta</Button>)
    rerender(<Button pending>Criando…</Button>)
    expect(screen.getByRole('button')).toHaveStyle({ minWidth: '180px' })
    rerender(<Button>Criar conta</Button>)
    expect(screen.getByRole('button').style.minWidth).toBe('')
    width.mockRestore()
  })

  it('repassa o ref e respeita disabled', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Button ref={ref} disabled>
        Salvar
      </Button>,
    )
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Salvar' }))
    expect(ref.current).toBeDisabled()
  })
})
