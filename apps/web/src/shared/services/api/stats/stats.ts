import { statsSchema, type Stats } from '@cruzadinha/shared'
import { apiRequest } from '../client/client'

export function getStats(): Promise<Stats> {
  return apiRequest('/api/stats', statsSchema)
}
