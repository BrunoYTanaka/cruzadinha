import { describe, expect, it } from 'vitest'
import { chatCompletion } from './fixtures'
import { chatCompletionSchema, cleanClues, clueOutputSchema } from './schema'

const answers = [
  { n: 1, plain: 'AGUA' },
  { n: 2, plain: 'SOL' },
]
const good = [
  { n: 2, clue: 'Estrela do nosso sistema' },
  { n: 1, clue: '  Líquido   da vida ' },
]

describe('chatCompletionSchema', () => {
  it('lê conteúdo e motivo de fim e ignora o resto', () => {
    const parsed = chatCompletionSchema.parse(chatCompletion('{}'))
    expect(parsed.choices[0]).toEqual({ message: { content: '{}' }, finish_reason: 'stop' })
  })
})

describe('clueOutputSchema', () => {
  it('ignora chaves extras e exige a lista', () => {
    expect(clueOutputSchema.safeParse({ clues: good, extra: 1 }).success).toBe(true)
    expect(clueOutputSchema.safeParse({ words: [] }).success).toBe(false)
  })
})

describe('cleanClues', () => {
  it('devolve as dicas na ordem das respostas, normalizadas', () => {
    expect(cleanClues(good, answers)).toEqual({
      ok: true,
      clues: ['Líquido da vida', 'Estrela do nosso sistema'],
    })
  })

  it.each([
    ['falta um n', [good[0]!]],
    ['sobra um n', [...good, { n: 3, clue: 'Outra dica' }]],
    ['n repetido', [good[0]!, good[0]!]],
    ['n de outro tipo', [good[0]!, { n: '1', clue: 'Líquido da vida' }]],
    ['dica de outro tipo', [good[0]!, { n: 1, clue: 3 }]],
  ])('recusa quando %s', (_, items) => {
    expect(cleanClues(items, answers)).toMatchObject({ ok: false, detail: 'dicas incompletas' })
  })

  it.each([
    ['curta demais', 'ab'],
    ['longa demais', 'a'.repeat(121)],
    ['com marcação', '<b>Líquido</b>'],
    ['com link', 'Veja https://exemplo.com'],
    ['com a resposta', 'Agua fresca'],
    ['com palavra que começa pela resposta', 'Águas do rio'],
    ['com termo bloqueado', 'Coisa de merda'],
  ])('recusa dica %s', (_, clue) => {
    expect(cleanClues([{ n: 1, clue }, good[0]!], answers)).toMatchObject({
      ok: false,
      detail: 'dica inválida',
      retry: [1],
    })
  })

  // Issue #187: respostas curtas aparecem dentro de qualquer palavra ("SOL" em "consola").
  it('aceita a resposta no meio de outra palavra', () => {
    expect(cleanClues([{ n: 2, clue: 'Astro que nos consola' }, good[1]!], answers)).toEqual({
      ok: true,
      clues: ['Líquido da vida', 'Astro que nos consola'],
    })
  })

  it('devolve as dicas boas e só os números a repetir', () => {
    const result = cleanClues([good[0]!], answers)
    expect(result).toMatchObject({ ok: false, retry: [1] })
    expect(!result.ok && result.valid.get(2)).toBe('Estrela do nosso sistema')
  })
})
