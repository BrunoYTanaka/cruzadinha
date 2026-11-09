import { describe, expect, it } from 'vitest'
import {
  announceCanceled,
  announceDropped,
  announceGrabbed,
  announceMoved,
  moveBy,
  SORT_INSTRUCTIONS,
} from './sortable-announcements'

describe('sortable-announcements', () => {
  it('diz a posição como N de M em todos os anúncios', () => {
    expect(announceGrabbed('O Globo', 1, 4)).toContain('posição 1 de 4')
    expect(announceMoved('O Globo', 2, 4)).toBe('O Globo na posição 2 de 4.')
    expect(announceDropped('O Globo', 2, 4)).toBe('O Globo solta na posição 2 de 4.')
    expect(announceCanceled('O Globo', 1, 4)).toContain('voltou à posição 1 de 4')
  })

  it('as instruções citam Espaço, setas e Esc', () => {
    expect(SORT_INSTRUCTIONS).toMatch(/Espaço pega/)
    expect(SORT_INSTRUCTIONS).toMatch(/setas/)
    expect(SORT_INSTRUCTIONS).toMatch(/Esc cancela/)
  })

  it('moveBy move uma casa, respeita as pontas e não muta a entrada', () => {
    const items = ['a', 'b', 'c']
    expect(moveBy(items, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveBy(items, 1, 1)).toEqual(['a', 'c', 'b'])
    expect(moveBy(items, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveBy(items, 2, 1)).toEqual(['a', 'b', 'c'])
    expect(moveBy(['solo'], 0, 1)).toEqual(['solo'])
    expect(items).toEqual(['a', 'b', 'c'])
  })
})
