import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CrosswordCells } from './CrosswordCells'

describe('CrosswordCells', () => {
  it('desenha uma casa por letra, numera a primeira e fica oculta do leitor de tela', () => {
    const { container } = render(<CrosswordCells word="GRADE" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.children).toHaveLength(5)
    expect(root.children[0]).toHaveTextContent('G1')
    expect(root.children[4]).toHaveTextContent('E')
  })

  it('conta letras acentuadas como uma casa', () => {
    const { container } = render(<CrosswordCells word="CALENDÁRIO" />)
    expect(container.firstElementChild?.children).toHaveLength(10)
  })
})
