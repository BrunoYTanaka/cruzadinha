import {
  adminSourcesResponseSchema,
  sourcesResponseSchema,
  updateSourcesRequestSchema,
} from '@cruzadinha/shared'
import type { FastifySchema } from 'fastify'
import { commonErrors, errorResponse, toDocSchema } from '../../platform/docs/doc-schema'

const notFound = errorResponse(
  'Não administrador (visitante, cookie inválido ou conta comum): o mesmo `404` de uma rota ' +
    'inexistente, decidido antes de ler o corpo. Nunca `401` nem `403`.',
)

export const getSourcesSchema = {
  tags: ['sources'],
  summary: 'Fontes visíveis, em ordem',
  description:
    'Lista pública das fontes que o site mostra (abas do calendário, cartões de "Hoje", x1, ' +
    'estatísticas e configurações), já na ordem definida pela administração. Sem configuração ' +
    'salva, todas as fontes na ordem padrão. Sem dado de usuário. Nunca vazia.',
  response: {
    200: { description: 'Fontes visíveis', ...toDocSchema(sourcesResponseSchema) },
    ...commonErrors,
  },
} satisfies FastifySchema

export const getAdminSourcesSchema = {
  tags: ['sources'],
  security: [{ session: [] }],
  summary: 'Fontes com visibilidade e posição (administração)',
  description: 'Todas as fontes, inclusive as escondidas, em ordem. Só para contas de admin.',
  response: {
    200: { description: 'Configuração atual', ...toDocSchema(adminSourcesResponseSchema) },
    404: notFound,
    ...commonErrors,
  },
} satisfies FastifySchema

export const putAdminSourcesSchema = {
  tags: ['sources'],
  security: [{ session: [] }],
  summary: 'Define visibilidade e ordem das fontes (administração)',
  description:
    'Cada fonte conhecida exatamente uma vez; a ordem do vetor é a ordem salva. Recusa deixar ' +
    'todas escondidas. Cada alteração que muda algo grava uma linha de registro.',
  body: toDocSchema(updateSourcesRequestSchema),
  response: {
    200: { description: 'Estado salvo', ...toDocSchema(adminSourcesResponseSchema) },
    400: errorResponse(
      '`invalid-input` (`fields: ["sources"]`): lista incompleta, repetida ou id desconhecido. ' +
        '`no-visible-source`: nenhuma fonte visível.',
    ),
    404: notFound,
    ...commonErrors,
  },
} satisfies FastifySchema
