import { describe, expect, it } from 'vitest'
import { clueText } from './clue-text'

describe('clueText', () => {
  it('mantém acentos e cedilha', () => {
    expect(clueText('Ação do órgão')).toBe('Ação do órgão')
  })

  it('decodifica entidades nomeadas e numéricas', () => {
    expect(clueText('A &amp; B &lt;c&gt; &quot;d&quot; &#39;e&#39; &#x41;&nbsp;f')).toBe(
      'A & B <c> "d" \'e\' A f',
    )
  })

  it('remove marcação e reduz espaços', () => {
    expect(clueText('  <b>Roedor</b>   de<br/>esgoto \n')).toBe('Roedor de esgoto')
  })

  it('devolve null para vazio e para entidade desconhecida', () => {
    expect(clueText('  <i></i> ')).toBeNull()
    expect(clueText('&foo;')).toBeNull()
    expect(clueText('&#0;')).toBeNull()
  })
})
