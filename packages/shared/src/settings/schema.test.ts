import { describe, expect, it } from 'vitest'
import { puzzleSourceIdSchema } from '../puzzle/schema'
import {
  defaultSettings,
  parseSettings,
  parseStoredSettings,
  saveSettingsRequestSchema,
  settingsEnvelopeSchema,
  type Settings,
} from './schema'

const defaults = defaultSettings({ letters: 4, words: 2 })

const full: Settings = {
  theme: 'dark',
  helpLetters: 6,
  helpWords: null,
  strikeMode: 'filled',
  defaultSource: 'cruzadaonline',
  directToGame: true,
  boardCellSize: 72,
  libraryWidth: 1200,
  copyClue: true,
  verifyOnType: true,
}

describe('defaultSettings', () => {
  it('usa os limites de ajuda recebidos e os padrões de cada campo', () => {
    expect(defaults).toEqual({
      theme: 'auto',
      helpLetters: 4,
      helpWords: 2,
      strikeMode: 'solved',
      defaultSource: puzzleSourceIdSchema.options[0],
      directToGame: false,
      boardCellSize: null,
      libraryWidth: null,
      copyClue: false,
      verifyOnType: false,
    })
  })
})

describe('parseSettings', () => {
  it('aceita o objeto completo', () => {
    expect(parseSettings(full, defaults)).toEqual(full)
  })

  it('troca só o campo inválido pelo padrão', () => {
    expect(parseSettings({ ...full, helpLetters: 120 }, defaults)).toEqual({
      ...full,
      helpLetters: 4,
    })
    expect(parseSettings({ ...full, theme: 'roxo' }, defaults)).toEqual({ ...full, theme: 'auto' })
    expect(parseSettings({ ...full, boardCellSize: 20 }, defaults)).toEqual({
      ...full,
      boardCellSize: null,
    })
    expect(parseSettings({ ...full, libraryWidth: 2000 }, defaults)).toEqual({
      ...full,
      libraryWidth: null,
    })
  })

  it('troca verifyOnType inválido ou ausente pelo padrão sem derrubar os outros (feature 047)', () => {
    const parsed = parseSettings({ ...full, verifyOnType: 'sim' }, defaults)
    expect(parsed.verifyOnType).toBe(false)
    expect(parsed.theme).toBe('dark')
    expect(parseSettings({ theme: 'light' }, defaults).verifyOnType).toBe(false)
  })

  it('troca copyClue inválido pelo padrão (feature 033)', () => {
    expect(parseSettings({ ...full, copyClue: 'sim' }, defaults).copyClue).toBe(false)
    expect(parseSettings({ theme: 'light' }, defaults).copyClue).toBe(false)
  })

  it('aceita sem limite nas ajudas', () => {
    const parsed = parseSettings({ ...full, helpLetters: null, helpWords: null }, defaults)
    expect(parsed.helpLetters).toBeNull()
    expect(parsed.helpWords).toBeNull()
  })

  it('aceita uma fonte que o site ainda não conhece, se o formato for válido', () => {
    expect(parseSettings({ ...full, defaultSource: 'nova-fonte' }, defaults).defaultSource).toBe(
      'nova-fonte',
    )
    expect(parseSettings({ ...full, defaultSource: 'Nova Fonte!' }, defaults).defaultSource).toBe(
      defaults.defaultSource,
    )
  })

  it('descarta chaves desconhecidas', () => {
    expect(parseSettings({ ...full, extra: 1 }, defaults)).toEqual(full)
  })

  it('completa campos ausentes com os padrões', () => {
    expect(parseSettings({ theme: 'light' }, defaults)).toEqual({ ...defaults, theme: 'light' })
  })

  it('devolve os padrões para valores que não são objeto, sem lançar exceção', () => {
    expect(parseSettings(null, defaults)).toEqual(defaults)
    expect(parseSettings('tema', defaults)).toEqual(defaults)
    expect(parseSettings([1, 2], defaults)).toEqual(defaults)
    expect(parseSettings(undefined, defaults)).toEqual(defaults)
  })
})

describe('parseStoredSettings', () => {
  it('fica só com os campos válidos, sem acrescentar padrões', () => {
    expect(parseStoredSettings({ theme: 'dark', helpLetters: 500, extra: true })).toEqual({
      theme: 'dark',
    })
  })

  it('devolve objeto vazio para valores que não são objeto', () => {
    expect(parseStoredSettings(null)).toEqual({})
    expect(parseStoredSettings('x')).toEqual({})
    expect(parseStoredSettings([])).toEqual({})
  })

  it('mantém copyClue válido', () => {
    expect(parseStoredSettings({ copyClue: true })).toEqual({ copyClue: true })
  })

  it('mantém null quando o campo aceita null', () => {
    expect(parseStoredSettings({ helpWords: null })).toEqual({ helpWords: null })
  })
})

describe('saveSettingsRequestSchema', () => {
  const savedAt = '2026-10-21T13:05:40.120Z'

  it('aceita o pedido sem copyClue, de um site anterior (feature 033)', () => {
    const older = Object.fromEntries(Object.entries(full).filter(([key]) => key !== 'copyClue'))
    expect(saveSettingsRequestSchema.safeParse({ settings: older, savedAt }).success).toBe(true)
  })

  it('aceita o pedido sem verifyOnType, de um site anterior (feature 047)', () => {
    const older = Object.fromEntries(Object.entries(full).filter(([key]) => key !== 'verifyOnType'))
    expect(saveSettingsRequestSchema.safeParse({ settings: older, savedAt }).success).toBe(true)
  })

  it('aceita o pedido completo', () => {
    expect(saveSettingsRequestSchema.safeParse({ settings: full, savedAt }).success).toBe(true)
  })

  it('recusa um campo conhecido inválido, indicando o caminho', () => {
    const result = saveSettingsRequestSchema.safeParse({
      settings: { ...full, strikeMode: 'never' },
      savedAt,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['settings', 'strikeMode'])
  })

  it('recusa campo ausente', () => {
    const partial: Partial<Settings> = { ...full }
    delete partial.theme
    expect(saveSettingsRequestSchema.safeParse({ settings: partial, savedAt }).success).toBe(false)
  })

  it('recusa savedAt ausente ou fora do formato', () => {
    expect(saveSettingsRequestSchema.safeParse({ settings: full }).success).toBe(false)
    expect(saveSettingsRequestSchema.safeParse({ settings: full, savedAt: 'ontem' }).success).toBe(
      false,
    )
  })

  it('aceita e descarta chaves desconhecidas em settings', () => {
    const result = saveSettingsRequestSchema.safeParse({
      settings: { ...full, newOption: true },
      savedAt,
    })
    expect(result.success).toBe(true)
    expect(result.data?.settings).toEqual(full)
  })
})

describe('settingsEnvelopeSchema', () => {
  it('aceita a conta que nunca salvou', () => {
    expect(settingsEnvelopeSchema.safeParse({ settings: null, savedAt: null }).success).toBe(true)
  })

  it('aceita configurações parciais', () => {
    const result = settingsEnvelopeSchema.safeParse({
      settings: { theme: 'light' },
      savedAt: '2026-10-21T13:05:40.120Z',
    })
    expect(result.success).toBe(true)
  })
})
