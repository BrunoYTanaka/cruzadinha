import { saveSettingsRequestSchema, settingsEnvelopeSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import {
  commonErrors,
  errorResponse,
  retryAfterHeader,
  toDocSchema,
} from '../../platform/docs/doc-schema'

const unauthenticated = errorResponse('`unauthenticated`: sem sessão válida.')

const envelopeNote =
  '`settings` é `null` quando a conta nunca salvou. Um campo guardado que não vale mais é omitido: ' +
  'o site completa os que faltam com os próprios padrões. '

export const getSettingsSchema = {
  tags: ['settings'],
  security: [{ session: [] }],
  summary: 'Lê as configurações da conta',
  description: `${envelopeNote}Cada usuário só enxerga as próprias configurações.`,
  response: {
    200: { description: 'Configurações (ou `null`)', ...toDocSchema(settingsEnvelopeSchema) },
    401: unauthenticated,
    ...commonErrors,
  },
} satisfies FastifySchema

export const saveSettingsSchema = {
  tags: ['settings'],
  security: [{ session: [] }],
  summary: 'Salva as configurações da conta',
  description:
    `${envelopeNote}Vale a mudança mais recente: um \`savedAt\` igual ou anterior ao guardado não altera nada ` +
    'e a resposta mostra o que vale. Chaves desconhecidas em `settings` são descartadas, para que uma versão ' +
    'mais nova do site continue aceita. `defaultSource` é aceito pelo formato, mesmo uma fonte que a API ' +
    'ainda não conhece. Corpo de até 4096 bytes.',
  body: {
    ...toDocSchema(saveSettingsRequestSchema),
    examples: [
      {
        settings: {
          theme: 'dark',
          helpLetters: 6,
          helpWords: null,
          strikeMode: 'solved',
          defaultSource: 'oglobo',
          directToGame: false,
          boardCellSize: null,
          libraryWidth: 1200,
          copyClue: false,
        },
        savedAt: '2026-10-21T13:05:40.120Z',
      },
    ],
  },
  response: {
    200: { description: 'Configurações que valem', ...toDocSchema(settingsEnvelopeSchema) },
    400: errorResponse(
      '`invalid-input`: campo de `settings` inválido, `savedAt` ausente ou mais de 5 minutos no futuro, ou corpo grande demais.',
    ),
    401: unauthenticated,
    429: {
      ...errorResponse('`too-many-attempts`: limite de gravações de configurações atingido.'),
      headers: retryAfterHeader,
    },
    ...commonErrors,
  },
} satisfies FastifySchema
