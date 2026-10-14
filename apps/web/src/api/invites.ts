import {
  createdInviteSchema,
  inviteListSchema,
  type CreatedInvite,
  type InviteList,
} from '@cruzadinha/shared'
import { apiRequest } from './client'

export function createInvite(): Promise<CreatedInvite> {
  return apiRequest('/api/invites', createdInviteSchema, { method: 'POST' })
}

export function listInvites(): Promise<InviteList> {
  return apiRequest('/api/invites', inviteListSchema)
}
