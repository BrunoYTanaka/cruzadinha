import { describe, expect, it } from 'vitest'
import {
  difficultyTitle,
  discardGeneratedRequestSchema,
  GENERATED_SETTINGS_DEFAULT,
  generatedSettingsRequestSchema,
  generatedSourcesResponseSchema,
  generatedSourceViewSchema,
  isGeneratedSource,
  parseDifficultyTitle,
  type Difficulty,
} from './generated-settings'

describe('generated sources', () => {
  it('knows casa as the only generated source', () => {
    expect(isGeneratedSource('casa')).toBe(true)
    expect(isGeneratedSource('oglobo')).toBe(false)
  })

  it('defaults to 11 and medium', () => {
    expect(GENERATED_SETTINGS_DEFAULT).toEqual({ gridSize: 11, difficulty: 'medium' })
  })
})

describe('generatedSettingsRequestSchema', () => {
  const valid = { source: 'casa', gridSize: 13, difficulty: 'hard' }

  it('accepts sizes 9 to 15 and the three difficulties', () => {
    expect(generatedSettingsRequestSchema.safeParse(valid).success).toBe(true)
    for (const gridSize of [9, 15]) {
      expect(generatedSettingsRequestSchema.safeParse({ ...valid, gridSize }).success).toBe(true)
    }
  })

  it.each([
    ['size 8', { gridSize: 8 }],
    ['size 16', { gridSize: 16 }],
    ['fractional size', { gridSize: 11.5 }],
    ['unknown difficulty', { difficulty: 'extreme' }],
    ['a source that is not generated', { source: 'oglobo' }],
    ['an extra key', { extra: 1 }],
  ])('refuses %s', (_, change) => {
    expect(generatedSettingsRequestSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})

describe('discardGeneratedRequestSchema', () => {
  it('needs a generated source and a uuid', () => {
    const puzzleId = '0b7d6c43-6f1d-4f6c-9a50-2f0d3a1b9c11'
    expect(discardGeneratedRequestSchema.safeParse({ source: 'casa', puzzleId }).success).toBe(true)
    expect(discardGeneratedRequestSchema.safeParse({ source: 'casa', puzzleId: 'x' }).success).toBe(
      false,
    )
  })
})

describe('generatedSourcesResponseSchema', () => {
  it('drops a source this site does not know', () => {
    const view = { gridSize: 11, difficulty: 'medium', callsLeft: 3, today: null }
    const parsed = generatedSourcesResponseSchema.parse({
      sources: [
        { source: 'casa', ...view },
        { source: 'nova', ...view },
      ],
    })
    expect(parsed.sources.map((item) => item.source)).toEqual(['casa'])
  })
})

describe('difficulty title (feature 066)', () => {
  it('reads back the difficulty it writes', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      expect(parseDifficultyTitle(difficultyTitle(difficulty))).toBe(difficulty)
    }
    expect(difficultyTitle('medium')).toBe('Dificuldade: Médio')
  })

  it('answers null for a title it did not write', () => {
    for (const title of [null, '', 'Dificuldade: Média', 'Outro']) {
      expect(parseDifficultyTitle(title)).toBeNull()
    }
  })

  it('accepts today without difficulty, with null and with a value', () => {
    const today = { puzzleId: 'x', size: 11, discardable: true, blockedBy: null, words: [] }
    const view = { source: 'casa', gridSize: 11, difficulty: 'medium', callsLeft: 3 }
    expect(generatedSourceViewSchema.parse({ ...view, today }).today?.difficulty).toBeUndefined()
    for (const difficulty of [null, 'hard']) {
      expect(
        generatedSourceViewSchema.parse({ ...view, today: { ...today, difficulty } }).today
          ?.difficulty,
      ).toBe(difficulty)
    }
    expect(
      generatedSourceViewSchema.safeParse({ ...view, today: { ...today, difficulty: 'x' } })
        .success,
    ).toBe(false)
  })
})
