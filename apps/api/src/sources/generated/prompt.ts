import type { Difficulty } from '@cruzadinha/shared'

// Feature 065: o pedido ao modelo (contracts/clue-request.md). A grade e as respostas já vêm
// prontas do código; o modelo só escreve uma dica por resposta numerada.

export type ChatMessage = { role: 'system' | 'user'; content: string }

const SYSTEM = `Você escreve dicas para palavras cruzadas em português do Brasil.
Regras:
- Uma dica para cada palavra da lista, pelo número dela. Não troque, corrija nem pule palavras.
- A palavra pode ser forma flexionada (plural, feminino, verbo conjugado): a dica deve levar a essa forma exata.
- Cada dica é curta (até 120 caracteres), em texto puro, e não contém a palavra nem parte dela.
- A dica não pode conter a palavra nem outra forma dela (conjugada, infinitivo, plural, feminino): descreva o sentido com outras palavras.
- Evite política partidária, religião, violência, sexo, tragédias, doenças graves e linguagem ofensiva.
Responda só com JSON neste formato:
{"clues":[{"n":1,"clue":"Líquido incolor essencial à vida"},{"n":2,"clue":"Estrela do nosso sistema"}]}`

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  easy: 'Fácil — palavras comuns do dia a dia, dicas diretas e curtas.',
  medium: 'Médio — vocabulário geral e conhecimentos comuns, dicas claras.',
  hard: 'Difícil — palavras menos frequentes e conhecimentos mais específicos, dicas indiretas.',
}

const REPAIR_TEXT =
  'Atenção: a dica anterior destas palavras foi recusada porque continha a própria palavra. Escreva outra dica sem nenhuma forma da palavra (nem conjugada, nem infinitivo): descreva o sentido com outras palavras.'

export type ClueAnswer = { n: number; form: string }

export function buildCluePrompt(options: {
  answers: readonly ClueAnswer[]
  difficulty: Difficulty
  /** Reparo: a dica anterior destas palavras foi recusada, e o modelo é avisado do motivo. */
  repair?: boolean
}): ChatMessage[] {
  const lines = [
    `Dificuldade: ${DIFFICULTY_TEXT[options.difficulty]}`,
    ...(options.repair ? [REPAIR_TEXT] : []),
    'Palavras:',
    ...options.answers.map((a) => `${a.n}. ${a.form}`),
  ]
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]
}
