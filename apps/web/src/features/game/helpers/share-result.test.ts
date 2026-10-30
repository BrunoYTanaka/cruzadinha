import { puzzleSourceIdSchema, puzzleSourceNames } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { buildShareText } from './share-result'

describe('buildShareText', () => {
  it.each(puzzleSourceIdSchema.options)('traz fonte, data e tempo de %s', (source) => {
    expect(buildShareText({ source, date: '2026-10-30', elapsedMs: 468_000 })).toBe(
      `Cruzadinha · ${puzzleSourceNames[source]} · 30/10/2026\nConcluí em 07:48`,
    )
  })

  it('mantém o ano de uma data antiga e usa h:mm:ss a partir de 1 hora', () => {
    expect(buildShareText({ source: 'oglobo', date: '2024-01-05', elapsedMs: 3_723_000 })).toBe(
      'Cruzadinha · O Globo · 05/01/2024\nConcluí em 1:02:03',
    )
  })

  it('tem duas linhas e nenhum dado pessoal', () => {
    const text = buildShareText({ source: 'clube', date: '2026-10-30', elapsedMs: 1000 })
    expect(text.split('\n')).toHaveLength(2)
    expect(text).not.toContain('@')
  })
})
