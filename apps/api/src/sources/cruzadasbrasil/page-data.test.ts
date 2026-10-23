import { describe, expect, it } from 'vitest'
import { readFixture } from './fixtures'
import { readPageData } from './page-data'

describe('readPageData', () => {
  it('extrai o objeto dos dados do jogo', () => {
    const result = readPageData(readFixture('daily-valid.html'))
    expect(result.ok).toBe(true)
    expect(result.ok && result.data).toMatchObject({
      id: '20261016',
      nivel: 'Diário',
      dimensoes: { linhas: 5, colunas: 5 },
    })
  })

  it('mantém aspas, barras e acentos das dicas', () => {
    const result = readPageData(readFixture('daily-valid.html'))
    const horizontais = result.ok
      ? (result.data as { dicas: { horizontais: { dica: string }[] } }).dicas.horizontais
      : []
    expect(horizontais[0]?.dica).toBe('Ato, em português &amp; em &quot;ação&quot;')
  })

  it('devolve "ausente" sem dados do jogo ou sem payload', () => {
    for (const name of ['no-game-data.html', 'coming-soon.html']) {
      expect(readPageData(readFixture(name))).toEqual({
        ok: false,
        detail: 'dados do jogo ausentes',
      })
    }
  })

  it('recusa JSON quebrado', () => {
    const result = readPageData(readFixture('invalid-json.html'))
    expect(result.ok).toBe(false)
  })

  it('não interpreta o texto da página como código', () => {
    const html = `<script>self.__next_f.push([1,"\\"dadosJogo\\":{\\"id\\":\\"x\\",\\"a\\":\\"}{\\"}"])</script><script>globalThis.hacked = 1</script>`
    expect(readPageData(html)).toMatchObject({ ok: true, data: { id: 'x', a: '}{' } })
    expect((globalThis as { hacked?: number }).hacked).toBeUndefined()
  })
})
