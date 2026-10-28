import { afterEach, describe, expect, it } from 'vitest'
import { updateSettings } from '../../shared/services/settings-store/settings-store'
import { playTodayLoader } from './play-today'

afterEach(() => window.localStorage.clear())

describe('playTodayLoader', () => {
  it('leva ao dia de hoje da primeira fonte quando não há cruzada padrão escolhida', () => {
    const response = playTodayLoader({ today: () => '2026-10-28' })() as Response
    expect(response.headers.get('Location')).toMatch(/^\/dia\/2026-10-28\?fonte=[a-z]+$/)
  })

  it('usa a cruzada padrão dos ajustes', () => {
    updateSettings({ defaultSource: 'cruzadaonline' })
    const response = playTodayLoader({ today: () => '2026-10-28' })() as Response
    expect(response.headers.get('Location')).toBe('/dia/2026-10-28?fonte=cruzadaonline')
  })
})
