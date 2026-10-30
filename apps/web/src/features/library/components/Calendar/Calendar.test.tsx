import { describe, expect, it } from 'vitest'
import { readCss } from '../../../../test/css-file'

describe('Calendar reserva espaço para o filtro (feature 053)', () => {
  const css = readCss('Calendar.module.css')

  it('a região de status tem altura mínima fixa, então trocar de filtro não desloca a grade', () => {
    expect(css).toMatch(/\.statusInfo\s*{[^}]*min-height:\s*1\.4em/)
  })

  it('a barra de filtros tem altura mínima fixa', () => {
    expect(readCss('StatusFilter.module.css')).toMatch(/\.bar\s*{[^}]*min-height:\s*var\(--tap\)/)
  })

  it('o dia apagado não usa opacidade (o contraste fica para o axe)', () => {
    expect(css).not.toMatch(/\.dimmed[^{]*{[^}]*opacity/)
  })
})
