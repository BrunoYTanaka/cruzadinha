import { describe, expect, it } from 'vitest'
import { chatCompletion } from './fixtures'
import { chatCompletionSchema, cleanWords, modelOutputSchema } from './schema'

const clean = (items: { answer: unknown; clue: unknown }[], avoid: string[] = []) =>
  cleanWords(items, { size: 11, avoid: new Set(avoid) })

describe('chatCompletionSchema', () => {
  it('lê conteúdo e motivo de fim e ignora o resto', () => {
    const parsed = chatCompletionSchema.parse(chatCompletion('{}'))
    expect(parsed.choices[0]).toEqual({ message: { content: '{}' }, finish_reason: 'stop' })
  })
})

describe('modelOutputSchema', () => {
  it('exige de 20 a 100 itens', () => {
    const item = { answer: 'SOL', clue: 'Estrela' }
    expect(modelOutputSchema.safeParse({ words: Array(19).fill(item) }).success).toBe(false)
    expect(modelOutputSchema.safeParse({ words: Array(20).fill(item) }).success).toBe(true)
    expect(modelOutputSchema.safeParse({ words: Array(101).fill(item) }).success).toBe(false)
  })
})

describe('cleanWords', () => {
  it('aceita e normaliza um item válido, com acento', () => {
    expect(clean([{ answer: ' água ', clue: '  Líquido   da vida ' }])).toEqual([
      { answer: 'ÁGUA', clue: 'Líquido da vida' },
    ])
  })

  it.each([
    ['número', { answer: 'R2D2', clue: 'Robô' }],
    ['espaço', { answer: 'SÃO PAULO', clue: 'Cidade' }],
    ['hífen', { answer: 'GUARDA-CHUVA', clue: 'Protege da chuva' }],
    ['menos de 3 letras', { answer: 'LÁ', clue: 'Advérbio de lugar' }],
    ['mais letras que a grade', { answer: 'PARALELEPÍPEDO', clue: 'Pedra da rua' }],
    ['dica vazia', { answer: 'SOL', clue: '  ' }],
    ['dica longa demais', { answer: 'SOL', clue: 'a'.repeat(121) }],
    ['dica com marcação', { answer: 'SOL', clue: '<b>Estrela</b>' }],
    ['dica com link', { answer: 'SOL', clue: 'Veja https://exemplo.com' }],
    ['dica com a resposta', { answer: 'SOL', clue: 'Raio de sol' }],
    ['dica com a resposta sem acento', { answer: 'ÁGUA', clue: 'Agua fresca' }],
    ['resposta bloqueada', { answer: 'PORRA', clue: 'Palavrão' }],
    ['dica com termo bloqueado', { answer: 'NOITE', clue: 'Hora da merda' }],
    ['tipos errados', { answer: 3, clue: null }],
  ])('descarta item com %s', (_, item) => {
    expect(clean([item])).toEqual([])
  })

  it('descarta resposta repetida, comparando sem acento', () => {
    const items = [
      { answer: 'AVO', clue: 'Pai do pai' },
      { answer: 'AVÓ', clue: 'Mãe da mãe' },
    ]
    expect(clean(items)).toEqual([{ answer: 'AVO', clue: 'Pai do pai' }])
  })

  it('descarta resposta usada nos últimos 30 dias, comparando sem acento', () => {
    expect(clean([{ answer: 'CORAÇÃO', clue: 'Bate no peito' }], ['CORACAO'])).toEqual([])
  })
})
