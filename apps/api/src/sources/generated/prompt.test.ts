import { describe, expect, it } from 'vitest'
import { buildPrompt, wordCount } from './prompt'

describe('buildPrompt', () => {
  it('manda as regras fixas e o pedido do dia', () => {
    const [system, user] = buildPrompt({
      size: 11,
      difficulty: 'medium',
      date: '2026-11-18',
      avoid: ['SOL', 'MARTE'],
    })
    expect(system?.role).toBe('system')
    expect(system?.content).toContain('Responda só com JSON')
    expect(system?.content).toContain('Evite política partidária')
    expect(user).toEqual({
      role: 'user',
      content: [
        'Data: 2026-11-18.',
        'Dificuldade: Médio — vocabulário geral e conhecimentos comuns, dicas claras.',
        'Gere 64 palavras com 3 a 11 letras, variando os tamanhos.',
        'Não use estas respostas: SOL, MARTE.',
      ].join('\n'),
    })
  })

  it('muda o texto pela dificuldade e omite "Não use" sem lista', () => {
    const user = buildPrompt({ size: 15, difficulty: 'hard', date: '2026-11-18', avoid: [] })[1]!
    expect(user.content).toContain('Dificuldade: Difícil')
    expect(user.content).toContain('Gere 80 palavras com 3 a 15 letras')
    expect(user.content).not.toContain('Não use')
    expect(
      buildPrompt({ size: 9, difficulty: 'easy', date: 'x', avoid: [] })[1]!.content,
    ).toContain('Fácil — palavras comuns do dia a dia')
  })

  it('pede 4 x N + 20 palavras', () => {
    expect([9, 11, 13, 15].map(wordCount)).toEqual([56, 64, 72, 80])
  })
})
