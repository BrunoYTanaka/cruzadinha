import { describe, expect, it } from 'vitest'
import { clueText } from './clue-text'

describe('clueText', () => {
  it('tira a marcação e mantém o texto na ordem', () => {
    expect(clueText('Filha dos mesmos pais (<i>fem.</i>).')).toBe('Filha dos mesmos pais (fem.).')
    expect(clueText('<b>HORIZONTAL</b>')).toBe('HORIZONTAL')
  })

  it('troca a quebra de linha por espaço', () => {
    expect(clueText('Primeira<br/>segunda')).toBe('Primeira segunda')
    expect(clueText('Primeira<br>segunda')).toBe('Primeira segunda')
  })

  it('decodifica as entidades predefinidas e as referências numéricas', () => {
    expect(clueText('Casa &amp; escola')).toBe('Casa & escola')
    expect(clueText('&lt;a&gt; &quot;b&quot; &apos;c&apos;')).toBe(`<a> "b" 'c'`)
    expect(clueText('La&#231;o e la&#xE7;o')).toBe('Laço e laço')
  })

  it('junta espaços repetidos e tira os das pontas', () => {
    expect(clueText('  Sem   umidade.\n ')).toBe('Sem umidade.')
  })

  it('mantém aspas tipográficas e reticências', () => {
    expect(clueText('Prender com “laço” (…).')).toBe('Prender com “laço” (…).')
  })

  it('recusa entidade com nome desconhecido e texto vazio', () => {
    expect(clueText('Sem&nbsp;espaço')).toBeNull()
    expect(clueText('')).toBeNull()
    expect(clueText('  <i> </i> ')).toBeNull()
  })
})
