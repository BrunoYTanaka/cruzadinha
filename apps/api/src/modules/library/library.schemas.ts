import { libraryResponseSchema } from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, toDocSchema } from '../../docs/doc-schema'

export const getLibrarySchema = {
  tags: ['library'],
  security: [{ session: [] }],
  summary: 'Lista os puzzles disponíveis com a situação do usuário',
  description:
    'Devolve até 366 puzzles já guardados, do mais recente ao mais antigo, cada um com a situação do ' +
    'usuário (`not_started`, `in_progress` ou `completed`) e os tempos dele. Só lê o que está ' +
    'guardado: nunca consulta a fonte nem consome o limite de busca, e não traz grade, dicas, ' +
    'solução nem letras. Cada usuário só enxerga a própria situação.',
  response: {
    200: {
      description: 'Puzzles guardados (lista vazia se não houver nenhum)',
      ...toDocSchema(libraryResponseSchema),
      example: {
        items: [
          {
            puzzleId: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a',
            date: '2026-10-13',
            level: 'daily',
            status: 'completed',
            elapsedMs: null,
            finishedMs: 412000,
            completedAt: '2026-10-13T14:03:22.000Z',
            bestMs: 398000,
            bestAt: '2026-10-10T09:12:45.000Z',
          },
          {
            puzzleId: '5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b',
            date: '2026-10-12',
            level: 'daily',
            status: 'not_started',
            elapsedMs: null,
            finishedMs: null,
            completedAt: null,
            bestMs: null,
            bestAt: null,
          },
        ],
      },
    },
    401: errorResponse('`unauthenticated`: sem sessão válida.'),
    ...commonErrors,
  },
} satisfies FastifySchema
