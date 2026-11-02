import {
  importProgressResponseSchema,
  progressEnvelopeSchema,
  type ImportItem,
  type ImportProgressResponse,
  type ProgressEnvelope,
  type SaveProgressRequest,
} from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

function path(puzzleId: string): string {
  return `/api/progress/${encodeURIComponent(puzzleId)}`
}

export function getProgress(puzzleId: string): Promise<ProgressEnvelope> {
  return apiRequest(path(puzzleId), progressEnvelopeSchema)
}

// `keepalive` deixa o envio terminar mesmo se a página estiver sendo fechada.
export function saveProgress(
  puzzleId: string,
  body: SaveProgressRequest,
  options: { keepalive?: boolean } = {},
): Promise<ProgressEnvelope> {
  return apiRequest(path(puzzleId), progressEnvelopeSchema, {
    method: 'PUT',
    body,
    keepalive: options.keepalive,
  })
}

export function resetProgress(puzzleId: string): Promise<ProgressEnvelope> {
  return apiRequest(`${path(puzzleId)}/reset`, progressEnvelopeSchema, { method: 'POST' })
}

// Importa progresso de visitante para a conta (feature 057); no máximo `MAX_IMPORT_ITEMS` por pedido.
export function importProgress(items: ImportItem[]): Promise<ImportProgressResponse> {
  return apiRequest('/api/progress/import', importProgressResponseSchema, {
    method: 'POST',
    body: { items },
  })
}
