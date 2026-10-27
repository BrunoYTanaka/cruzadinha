import {
  readStorage,
  removeStorage,
  writeStorage,
} from '../../../../shared/services/storage/storage'
import { clearDraft, listDrafts } from '../draft/draft'
import { clearKnownProgress } from '../offline-store/offline-store'
import { clearOutbox, listOutboxes } from '../outbox/outbox'

const DISCARDED_KEY = 'cruzadinha:outbox-discarded'
export const DISCARDED_EVENT = 'cruzadinha:outbox-discarded'

// Pendências pertencem à conta que jogou: nunca vão para outra sessão (feature 041, FR-012).
export function hasOutbox(userId: string): boolean {
  return listOutboxes().some((owner) => owner.userId === userId)
}

// Há progresso de alguma conta esperando no aparelho (visitante vê o aviso "esperando você entrar").
export function hasAnyOutbox(): boolean {
  return listOutboxes().length > 0
}

// Sair por vontade própria apaga tudo o que é da conta: pendências e progresso conhecido.
export async function clearAccountData(userId: string): Promise<void> {
  for (const owner of listOutboxes()) {
    if (owner.userId === userId) clearOutbox(owner.userId, owner.puzzleId)
  }
  for (const draft of listDrafts()) {
    if (draft.owner === userId) clearDraft(draft.owner, draft.puzzleId)
  }
  await clearKnownProgress(userId)
}

// Outra conta entrou neste aparelho: o que era da anterior não vai para a nova nem é enviado depois.
export async function discardOtherAccounts(userId: string): Promise<void> {
  const others = listOutboxes().filter((owner) => owner.userId !== userId)
  for (const owner of others) clearOutbox(owner.userId, owner.puzzleId)
  for (const draft of listDrafts()) {
    if (draft.owner !== userId && draft.owner !== 'guest') clearDraft(draft.owner, draft.puzzleId)
  }
  await clearKnownProgress(userId, { except: true })
  if (others.length > 0) {
    writeStorage(DISCARDED_KEY, '1')
    window.dispatchEvent(new Event(DISCARDED_EVENT))
  }
}

export function hasDiscardedNotice(): boolean {
  return readStorage(DISCARDED_KEY) === '1'
}

export function dismissDiscardedNotice(): void {
  removeStorage(DISCARDED_KEY)
}
