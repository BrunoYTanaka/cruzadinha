import { describe, expect, it } from 'vitest'
import { attributionLine } from './attribution'

const attribution = (overrides: Partial<Record<string, string | null>> = {}) => ({
  attribution: {
    sourceName: 'O Globo',
    title: null,
    author: null,
    copyright: null,
    ...overrides,
  },
})

describe('attributionLine', () => {
  it('junta fonte, título, autor e direitos', () => {
    expect(
      attributionLine(attribution({ title: 'Cruzada', author: 'Autora', copyright: 'Direitos' })),
    ).toBe('Fonte: O Globo · Cruzada · Autora · Direitos')
  })

  it('omite as partes vazias', () => {
    expect(attributionLine(attribution())).toBe('Fonte: O Globo')
  })

  it('não repete uma parte igual', () => {
    expect(
      attributionLine(attribution({ sourceName: 'Cruzada Online', copyright: 'Cruzada Online' })),
    ).toBe('Fonte: Cruzada Online')
  })

  it('Cruzadas Clube mostra a fonte, o título e o autor da edição (feature 030)', () => {
    expect(
      attributionLine(
        attribution({
          sourceName: 'Cruzadas Clube',
          title: 'Cruzadas clássicas 901',
          author: 'Autora de Exemplo',
        }),
      ),
    ).toBe('Fonte: Cruzadas Clube · Cruzadas clássicas 901 · Autora de Exemplo')
  })
})
