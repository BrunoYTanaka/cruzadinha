import { z } from 'zod'
import { puzzleSourceIdSchema } from '../puzzle/schema'

// Configurações da pessoa (feature 021): guardadas no aparelho e, para quem tem conta, também na
// conta. Os limites de ajuda vêm do build do site, por isso os padrões são montados lá.

export const themeSettingSchema = z.enum(['auto', 'light', 'dark'])
export const strikeModeSchema = z.enum(['solved', 'filled'])
// `null` é "sem limite".
export const helpLimitSchema = z.number().int().min(0).max(99).nullable()
// Só o formato: a lista de fontes muda entre versões do site e da API (FR-012b).
export const sourceIdFormatSchema = z.string().regex(/^[a-z0-9-]{1,40}$/)
// `null` é o tamanho que cabe na tela (feature 011).
const boardCellSizeSchema = z.number().int().min(30).max(110).nullable()
const libraryWidthSchema = z.number().int().min(720).max(1600).nullable()
const instantSchema = z.iso.datetime({ offset: true })

const fields = {
  theme: themeSettingSchema,
  helpLetters: helpLimitSchema,
  helpWords: helpLimitSchema,
  strikeMode: strikeModeSchema,
  defaultSource: sourceIdFormatSchema,
  directToGame: z.boolean(),
  boardCellSize: boardCellSizeSchema,
  libraryWidth: libraryWidthSchema,
  copyClue: z.boolean(),
  verifyOnType: z.boolean(),
}

// Objeto não estrito: chaves desconhecidas (de uma versão mais nova) são descartadas.
export const settingsSchema = z.object(fields)

export type Settings = z.infer<typeof settingsSchema>
export type ThemeSetting = z.infer<typeof themeSettingSchema>
export type StrikeModeSetting = z.infer<typeof strikeModeSchema>

export function defaultSettings(helpLimits: { letters: number; words: number }): Settings {
  const [firstSource] = puzzleSourceIdSchema.options
  if (firstSource === undefined) throw new Error('a lista de fontes está vazia')
  return {
    theme: 'auto',
    helpLetters: helpLimits.letters,
    helpWords: helpLimits.words,
    strikeMode: 'solved',
    defaultSource: firstSource,
    directToGame: false,
    boardCellSize: null,
    libraryWidth: null,
    copyClue: false,
    verifyOnType: false,
  }
}

const fieldNames = Object.keys(fields) as (keyof Settings)[]

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

// Leitura do site: cada campo inválido ou ausente vale o padrão, sem derrubar os outros (FR-018).
export function parseSettings(value: unknown, defaults: Settings): Settings {
  return { ...defaults, ...parseStoredSettings(value) }
}

// Leitura do servidor: só os campos válidos, sem padrões (o servidor não conhece os do site).
export function parseStoredSettings(value: unknown): Partial<Settings> {
  const record = asRecord(value)
  if (!record) return {}
  const result: Partial<Record<keyof Settings, unknown>> = {}
  for (const name of fieldNames) {
    if (!(name in record)) continue
    const parsed = fields[name].safeParse(record[name])
    if (parsed.success) result[name] = parsed.data
  }
  return result as Partial<Settings>
}

// Pedido: os campos válidos; chaves desconhecidas em `settings` são descartadas para que um
// site mais novo não tenha o pedido recusado por esta API (research R3). `copyClue` (feature 033)
// e `verifyOnType` (feature 047) podem faltar, para que o site anterior, que não os envia, não
// leve 400.
export const saveSettingsRequestSchema = z.object({
  settings: settingsSchema.extend({
    copyClue: z.boolean().optional(),
    verifyOnType: z.boolean().optional(),
  }),
  savedAt: instantSchema,
})

// Resposta: `settings` pode vir parcial (campos guardados que não valem mais são omitidos).
export const settingsEnvelopeSchema = z.object({
  settings: settingsSchema.partial().nullable(),
  savedAt: instantSchema.nullable(),
})

export type SaveSettingsRequest = z.infer<typeof saveSettingsRequestSchema>
export type SettingsEnvelope = z.infer<typeof settingsEnvelopeSchema>
