import { defaultSettings, type SaveSettingsRequest } from '@cruzadinha/shared'
import { describe, expect, it } from 'vitest'
import { decideSettingsSave } from './settings.service'

const now = new Date('2026-10-21T13:00:00.000Z')
const settings = { ...defaultSettings({ letters: 4, words: 2 }), theme: 'dark' as const }

const request = (savedAt: string): SaveSettingsRequest => ({ settings, savedAt })

describe('decideSettingsSave', () => {
  it('sem registro, grava', () => {
    expect(decideSettingsSave(undefined, request('2026-10-21T12:59:00.000Z'), now)).toEqual({
      kind: 'apply',
      savedAt: new Date('2026-10-21T12:59:00.000Z'),
    })
  })

  it('savedAt mais novo que o guardado grava', () => {
    const current = { savedAt: new Date('2026-10-21T12:00:00.000Z') }
    expect(decideSettingsSave(current, request('2026-10-21T12:30:00.000Z'), now).kind).toBe('apply')
  })

  it('savedAt igual ou mais antigo não muda nada (FR-022)', () => {
    const current = { savedAt: new Date('2026-10-21T12:30:00.000Z') }
    expect(decideSettingsSave(current, request('2026-10-21T12:30:00.000Z'), now)).toEqual({
      kind: 'unchanged',
    })
    expect(decideSettingsSave(current, request('2026-10-21T12:00:00.000Z'), now)).toEqual({
      kind: 'unchanged',
    })
  })

  it('savedAt mais de 5 minutos no futuro é recusado', () => {
    expect(decideSettingsSave(undefined, request('2026-10-21T13:06:00.000Z'), now)).toEqual({
      kind: 'invalid-saved-at',
    })
    expect(decideSettingsSave(undefined, request('2026-10-21T13:04:00.000Z'), now).kind).toBe(
      'apply',
    )
  })
})
