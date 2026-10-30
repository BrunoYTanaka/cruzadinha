import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderShareCard } from './share-card'

function stubCanvas(context: unknown) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
    callback(new Blob(['png'], { type: 'image/png' })),
  )
}

afterEach(() => vi.restoreAllMocks())

describe('renderShareCard', () => {
  it('desenha só marca, fonte, data e tempo e devolve um PNG', async () => {
    const drawn: string[] = []
    stubCanvas({
      fillRect: vi.fn(),
      fillText: (text: string) => drawn.push(text),
    })
    const blob = await renderShareCard({ source: 'oglobo', date: '2026-10-30', elapsedMs: 36_000 })
    expect(blob?.type).toBe('image/png')
    expect([...drawn].sort()).toEqual(
      ['00:36', '30/10/2026', 'Concluí em', 'Cruzadinha', 'O Globo'].sort(),
    )
  })

  it('devolve null quando o navegador não tem canvas', async () => {
    stubCanvas(null)
    expect(
      await renderShareCard({ source: 'clube', date: '2026-10-30', elapsedMs: 1000 }),
    ).toBeNull()
  })
})
