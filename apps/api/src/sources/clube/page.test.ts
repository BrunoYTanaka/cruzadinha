import { describe, expect, it } from 'vitest'
import { readFixture } from './fixtures'
import { isEditionPath, parseEditionPage, parseLatestEdition } from './page'

describe('parseEditionPage', () => {
  it('lê data, autor, arquivo do jogo e edição anterior', () => {
    expect(parseEditionPage(readFixture('page-valid.html'))).toEqual({
      ok: true,
      page: {
        date: '2026-10-19',
        author: 'Autora de Exemplo',
        scriptPath: '/jogos/CC901.js',
        previousPath: '/jogo/i/id/4890/cruzadas-classicas-900/',
      },
    })
  })

  it('a primeira edição não tem anterior', () => {
    const result = parseEditionPage(readFixture('page-first.html'))
    expect(result).toMatchObject({ ok: true, page: { date: '2020-01-01', previousPath: null } })
  })

  it('só vale a data de "postado em", não outras datas da página', () => {
    const html = readFixture('page-valid.html')
    expect(html).toContain('Atualizado em 01/01/2020')
    expect(parseEditionPage(html)).toMatchObject({ ok: true, page: { date: '2026-10-19' } })
  })

  it('sem data legível é formato inesperado', () => {
    expect(parseEditionPage(readFixture('page-no-date.html'))).toEqual({
      ok: false,
      detail: 'página: data não encontrada',
    })
    expect(parseEditionPage(readFixture('page-invalid-date.html'))).toEqual({
      ok: false,
      detail: 'página: data inválida',
    })
  })

  it('sem o arquivo do jogo é formato inesperado', () => {
    expect(parseEditionPage(readFixture('page-no-script.html'))).toEqual({
      ok: false,
      detail: 'página: arquivo do jogo não encontrado',
    })
  })

  it('o autor ausente vira null', () => {
    const html = readFixture('page-valid.html').replace(' por <b>Autora de Exemplo</b>', '')
    expect(parseEditionPage(html)).toMatchObject({ ok: true, page: { author: null } })
  })

  it('não segue link anterior que não seja de uma edição da fonte', () => {
    const html = readFixture('page-valid.html').replace(
      '/jogo/i/id/4890/cruzadas-classicas-900/',
      'https://outro.example/x/',
    )
    expect(parseEditionPage(html)).toMatchObject({ ok: true, page: { previousPath: null } })
  })
})

describe('parseLatestEdition', () => {
  it('devolve a primeira edição da lista de cruzadas clássicas', () => {
    expect(parseLatestEdition(readFixture('category.html'))).toBe(
      '/jogo/i/id/4898/cruzadas-classicas-901/',
    )
  })

  it('sem edição na lista devolve null', () => {
    expect(parseLatestEdition('<html></html>')).toBeNull()
  })
})

describe('isEditionPath', () => {
  it('aceita só caminhos de edição da própria fonte', () => {
    expect(isEditionPath('/jogo/i/id/4898/cruzadas-classicas-901/')).toBe(true)
    expect(isEditionPath('https://outro.example/jogo/i/id/1/x/')).toBe(false)
    expect(isEditionPath('/jogo/i/id/1/x/../../etc')).toBe(false)
  })
})
