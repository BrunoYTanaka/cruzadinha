import { puzzleSourceIdSchema } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { SOURCE_DESCRIPTIONS } from './source-descriptions'

describe('SOURCE_DESCRIPTIONS', () => {
  it('tem uma descrição não vazia para cada fonte do jogo e nenhuma a mais', () => {
    expect(Object.keys(SOURCE_DESCRIPTIONS).sort()).toEqual(
      [...puzzleSourceIdSchema.options].sort(),
    )
    for (const description of Object.values(SOURCE_DESCRIPTIONS)) {
      expect(description.trim().length).toBeGreaterThan(10)
    }
  })
})
