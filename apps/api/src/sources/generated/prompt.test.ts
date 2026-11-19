import { describe, expect, it } from 'vitest'
import { buildCluePrompt } from './prompt'

const answers = [
  { n: 1, form: 'água' },
  { n: 2, form: 'sol' },
]

describe('buildCluePrompt', () => {
  it('manda as regras fixas e as palavras numeradas', () => {
    const [system, user] = buildCluePrompt({ answers, difficulty: 'medium' })
    expect(system?.role).toBe('system')
    expect(system?.content).toContain('Responda só com JSON')
    expect(system?.content).toContain('Evite política partidária')
    expect(system?.content).toContain('nem outra forma dela')
    expect(user).toEqual({
      role: 'user',
      content: [
        'Dificuldade: Médio — vocabulário geral e conhecimentos comuns, dicas claras.',
        'Palavras:',
        '1. água',
        '2. sol',
      ].join('\n'),
    })
  })

  it('muda o texto pela dificuldade e não leva data nem respostas recentes', () => {
    const user = buildCluePrompt({ answers, difficulty: 'hard' })[1]!
    expect(user.content).toContain('Dificuldade: Difícil')
    expect(user.content).not.toMatch(/Data|Não use/)
    expect(buildCluePrompt({ answers, difficulty: 'easy' })[1]!.content).toContain(
      'Fácil — palavras comuns do dia a dia',
    )
  })

  it('no reparo avisa que a dica anterior foi recusada e por quê', () => {
    const user = buildCluePrompt({ answers, difficulty: 'easy', repair: true })[1]!
    expect(user.content).toContain('foi recusada porque continha a própria palavra')
    expect(buildCluePrompt({ answers, difficulty: 'easy' })[1]!.content).not.toContain('recusada')
  })
})
