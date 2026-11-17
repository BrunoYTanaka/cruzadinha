import {
  adminSourcesResponseSchema,
  discardGeneratedRequestSchema,
  discardGeneratedResponseSchema,
  generatedSettingsRequestSchema,
  generatedSourcesResponseSchema,
  generatedSourceViewSchema,
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

// Feature 064: fontes geradas no painel (contracts/admin-generated-sources.md).
export const getGeneratedSourcesSchema = {
  tags: ['sources'],
  security: [{ session: [] }],
  summary: 'Fontes geradas: configuração, chamadas do dia e cruzada de hoje (administração)',
  description:
    'Para cada fonte gerada: tamanho da grade, dificuldade, chamadas ao modelo que restam hoje e ' +
    'a cruzada de hoje (respostas e dicas) com o que impede o descarte. Só para contas de admin.',
  response: {
    200: { description: 'Fontes geradas', ...toDocSchema(generatedSourcesResponseSchema) },
    404: notFound,
    ...commonErrors,
  },
} satisfies FastifySchema

export const putGeneratedSettingsSchema = {
  tags: ['sources'],
  security: [{ session: [] }],
  summary: 'Define tamanho e dificuldade de uma fonte gerada (administração)',
  description: 'Vale a partir da próxima geração; cruzadas já salvas não mudam.',
  body: toDocSchema(generatedSettingsRequestSchema),
  response: {
    200: { description: 'Fonte atualizada', ...toDocSchema(generatedSourceViewSchema) },
    400: errorResponse(
      '`invalid-input`: fonte que não é gerada, tamanho fora de 9 a 15, dificuldade ' +
        'desconhecida ou chave a mais.',
    ),
    404: notFound,
    ...commonErrors,
  },
} satisfies FastifySchema

export const postDiscardGeneratedSchema = {
  tags: ['sources'],
  security: [{ session: [] }],
  summary: 'Descarta a cruzada de hoje de uma fonte gerada (administração)',
  description:
    'Apaga a cruzada de hoje se nenhuma conta tem progresso nela e nenhum x1 a usa; a próxima ' +
    'coleta gera outra dentro do limite de chamadas do dia.',
  body: toDocSchema(discardGeneratedRequestSchema),
  response: {
    200: { description: 'Descartada', ...toDocSchema(discardGeneratedResponseSchema) },
    400: errorResponse('`invalid-input`: corpo inválido.'),
    404: errorResponse(
      '`puzzle-unavailable`: não é a cruzada de hoje dessa fonte; ou não administrador (rota ' +
        'inexistente).',
    ),
    409: errorResponse('`in-use`: alguma conta tem progresso ou um x1 usa a cruzada.'),
    ...commonErrors,
  },
} satisfies FastifySchema
