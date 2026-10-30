import { describe, expect, it } from 'vitest'
import { readCss } from '../../../../../test/css-file'

const css = readCss('PrintSheet.module.css')
const print = css.slice(css.indexOf('@media print'))

describe('PrintSheet.module.css', () => {
  it('fica fora da tela e só aparece ao imprimir', () => {
    expect(css.slice(0, css.indexOf('@media print'))).toMatch(/\.sheet\s*{\s*display: none/)
    expect(print).toMatch(/\.sheet\s*{[^}]*display: block/)
  })

  it('esconde todo o resto da página ao imprimir', () => {
    expect(print).toMatch(/:global\(body\) > :not\(\.sheet\)\s*{\s*display: none !important/)
  })

  it('usa cores fixas, sem tokens de tema', () => {
    expect(print).toMatch(/background: #fff/)
    expect(print).toMatch(/color: #000/)
    expect(css).not.toMatch(/var\(--(?!cols)/)
    expect(print).toMatch(/print-color-adjust: exact/)
  })

  it('não parte uma dica e mantém a grade inteira', () => {
    expect(css).toMatch(/\.list li\s*{[^}]*break-inside: avoid/)
    expect(css).toMatch(/\.grid\s*{[^}]*break-inside: avoid/)
  })

  it('os bloqueios não dependem de cor de fundo', () => {
    expect(css).not.toMatch(/\.block\s*{[^}]*background/)
  })
})
