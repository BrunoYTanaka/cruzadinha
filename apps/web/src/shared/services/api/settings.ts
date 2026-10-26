import {
  settingsEnvelopeSchema,
  type SaveSettingsRequest,
  type SettingsEnvelope,
} from '@cruzadinha/shared'
import { apiRequest } from './client'

// Configurações da conta (feature 021). A API anterior não tem a rota e responde 404. A
// sincronização roda em segundo plano: uma sessão vencida não leva ao login por aqui (o 401 só
// para a sincronização; quem trata a sessão são as telas).
export function getSettings(): Promise<SettingsEnvelope> {
  return apiRequest('/api/settings', settingsEnvelopeSchema, { skipUnauthenticatedHandler: true })
}

export function saveSettings(body: SaveSettingsRequest): Promise<SettingsEnvelope> {
  return apiRequest('/api/settings', settingsEnvelopeSchema, {
    method: 'PUT',
    body,
    skipUnauthenticatedHandler: true,
  })
}
