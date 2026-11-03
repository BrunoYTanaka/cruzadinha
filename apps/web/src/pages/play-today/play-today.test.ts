import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetServerWake } from '../../shared/services/api/server-wake/server-wake'
import { saveSourceChoice } from '../../features/library'
import { jsonResponse, mockApi } from '../../test/http'
import { makeQueryClient, serverIsReady } from '../../test/render'
import { playTodayLoader } from './play-today'

beforeEach(async () => {
  await serverIsReady()
})
afterEach(() => {
  window.localStorage.clear()
  resetServerWake()
})

const run = async (sources: string[]) => {
  mockApi({ 'GET /api/sources': () => jsonResponse(200, { sources }) })
  const response = await playTodayLoader(makeQueryClient(), { today: () => '2026-10-28' })()
  return (response as Response).headers.get('Location')
}

describe('playTodayLoader', () => {
  it('leva ao dia de hoje da primeira fonte visível quando não há cruzada padrão escolhida', async () => {
    expect(await run(['clube', 'oglobo'])).toBe('/dia/2026-10-28?fonte=clube')
  })

  it('usa a cruzada padrão escolhida nos ajustes', async () => {
    saveSourceChoice('cruzadaonline')
    expect(await run(['oglobo', 'cruzadaonline'])).toBe('/dia/2026-10-28?fonte=cruzadaonline')
  })

  it('quem escolheu O Globo mantém O Globo mesmo com outra fonte em primeiro', async () => {
    saveSourceChoice('oglobo')
    expect(await run(['clube', 'oglobo'])).toBe('/dia/2026-10-28?fonte=oglobo')
  })

  it('cruzada padrão escondida vale como a primeira visível, sem regravar a escolha', async () => {
    saveSourceChoice('cruzadaonline')
    expect(await run(['clube', 'oglobo'])).toBe('/dia/2026-10-28?fonte=clube')
    expect(
      JSON.parse(window.localStorage.getItem('cruzadinha:settings') ?? '{}').settings,
    ).toMatchObject({ defaultSource: 'cruzadaonline' })
  })
})
