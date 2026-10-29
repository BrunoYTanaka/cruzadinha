import { puzzleSourceNames } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { renderLanding } from './landing-entry'

describe('renderLanding', () => {
  const html = renderLanding()

  it('traz o texto fixo da landing com um único h1 e um único main', () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(html.match(/<main[ >]/g)).toHaveLength(1)
    expect(html).toContain('id="conteudo"')
    expect(html).toContain('Pular para o conteúdo')
    expect(html).toContain('Jogar a cruzada de hoje')
    expect(html).toContain('Abriu, jogou. O resto é opcional.')
    expect(html).toContain('Funciona até sem internet')
    expect(html).toContain('A cruzada de hoje já está esperando.')
  })

  it('traz a frase de destaque dentro do único h1', () => {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
    expect(h1).toContain('Cruzadinha: ')
    expect(h1).toContain('Palavras cruzadas')
    expect(h1).toContain('todo dia')
  })

  it('traz a mini cruzada pronta, com a primeira dica', () => {
    expect(html).toContain('id="mini-cruzada"')
    expect(html).toContain('role="grid"')
    expect(html).toContain('Faixa de terra junto ao mar')
    expect(html).toContain('0 de 6 palavras certas.')
  })

  it('aponta os botões para endereços estáveis, sem data escrita', () => {
    expect(html).toContain('href="/jogar"')
    expect(html).toContain('href="/calendario"')
    expect(html).not.toMatch(/\/dia\/\d{4}-\d{2}-\d{2}/)
  })

  it('é determinístico', () => {
    expect(renderLanding()).toBe(html)
  })

  it('lista cada fonte do jogo', () => {
    for (const name of Object.values(puzzleSourceNames)) expect(html).toContain(name)
  })
})
