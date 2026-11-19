import type { Difficulty, PuzzleSourceId } from '@cruzadinha/shared'
import { generateGrid } from './fill'
import { seededRandom, seedFrom, toPuzzle } from './layout'
import type { Template } from './template'
import { WORD_LIST } from './words/word-list.data'
import { parseWordList, type WordEntry } from './words/word-list'

// Feature 065: dados inventados para os testes e o seed. Nunca uma resposta real do modelo (a
// resposta real reduzida do teste de contrato fica em fixtures/deepseek-response.json).

// Lista pequena que fecha o desenho 3 x 3 abaixo (MAR/ALI/LUA nas linhas, MAL/ALU/RIA nas colunas).
const entry = (plain: string, band: 1 | 2 | 3 = 1): WordEntry => ({
  plain,
  form: plain.toLowerCase(),
  band,
})
export const SAMPLE_LIST: readonly WordEntry[] = [
  ...['MAR', 'ALI', 'LUA', 'MAL', 'ALU', 'RIA'].map((w) => entry(w)),
  ...['SOL', 'RIO', 'ASA', 'ARA'].map((w) => entry(w)),
]
export const SAMPLE_TEMPLATE: Template = {
  size: 3,
  black: Array.from({ length: 3 }, () => Array<boolean>(3).fill(false)),
}

// Resposta HTTP no formato de `POST /chat/completions` (contrato), com o conteúdo dado.
export function chatCompletion(content: string, finishReason = 'stop') {
  return {
    id: 'teste',
    object: 'chat.completion',
    created: 0,
    model: 'modelo-de-teste',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }
}

/** Conteúdo do modelo com uma dica inventada por número, de 1 a `count`. */
export const sampleClues = (count = 2) =>
  JSON.stringify({
    clues: Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      clue: `Dica de exemplo ${i + 1}`,
    })),
  })

/** Puzzle denso de exemplo: preenche com a lista real e semente fixa; dicas inventadas. */
export function buildCasaSample(options: {
  source: PuzzleSourceId
  date: string
  size: number
  difficulty: Difficulty
  seed?: string
}) {
  const grid = generateGrid({
    size: options.size,
    words: parseWordList(WORD_LIST),
    maxBand: 3,
    random: seededRandom(seedFrom(options.seed ?? options.date)),
    clock: () => new Date(),
  })
  if (!grid) throw new Error('grade de exemplo não fechou')
  const clues = grid.words.map((_, i) => `Dica de exemplo ${i + 1}`)
  const built = toPuzzle(grid, clues, options)
  if (!built) throw new Error('puzzle de exemplo inválido')
  return { ...built, grid }
}
