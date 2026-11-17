import type { Difficulty } from '@cruzadinha/shared'

// Feature 064: o pedido ao modelo (contracts/deepseek-request.md). O modelo só manda palavras e
// dicas; a grade é montada por `layout`.

export type ChatMessage = { role: 'system' | 'user'; content: string }

const SYSTEM = `Você cria listas de palavras e dicas para palavras cruzadas em português do Brasil.
Regras:
- Tema: conhecimentos gerais variados (vocabulário, geografia, ciência, cultura, esportes, natureza).
- Cada resposta é UMA palavra que existe no dicionário ou um nome próprio conhecido.
  Sem espaços, hífens, números, siglas ou abreviações. Pode ter acento e cedilha.
- Cada dica é curta (até 120 caracteres), em texto puro, e não contém a resposta nem parte dela.
- Evite política partidária, religião, violência, sexo, tragédias, doenças graves e linguagem ofensiva.
- Não repita respostas.
Responda só com JSON neste formato:
{"words":[{"answer":"BRASIL","clue":"País de língua portuguesa na América do Sul"},
          {"answer":"ÁGUA","clue":"Líquido incolor essencial à vida"}]}`

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  easy: 'Fácil — palavras comuns do dia a dia, dicas diretas e curtas.',
  medium: 'Médio — vocabulário geral e conhecimentos comuns, dicas claras.',
  hard: 'Difícil — palavras menos frequentes e conhecimentos mais específicos, dicas indiretas.',
}

// Mais palavras que o necessário, para sobrar o bastante depois dos descartes (research R14).
export const wordCount = (size: number) => 4 * size + 20

export function buildPrompt(options: {
  size: number
  difficulty: Difficulty
  date: string
  avoid: readonly string[]
}): ChatMessage[] {
  const lines = [
    `Data: ${options.date}.`,
    `Dificuldade: ${DIFFICULTY_TEXT[options.difficulty]}`,
    `Gere ${wordCount(options.size)} palavras com 3 a ${options.size} letras, variando os tamanhos.`,
  ]
  if (options.avoid.length > 0) lines.push(`Não use estas respostas: ${options.avoid.join(', ')}.`)
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: lines.join('\n') },
  ]
}
