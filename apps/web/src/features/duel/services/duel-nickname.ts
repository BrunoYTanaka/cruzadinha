import { nicknameSchema } from '@cruzadinha/shared'
import { readStorage, writeStorage } from '../../../shared/services/storage/storage'

const KEY = 'cruzadinha:duel-nickname'

// O último apelido usado neste aparelho vem preenchido nos formulários do duelo.
export function loadNickname(): string {
  const parsed = nicknameSchema.safeParse(readStorage(KEY) ?? '')
  return parsed.success ? parsed.data : ''
}

export function saveNickname(nickname: string): void {
  const parsed = nicknameSchema.safeParse(nickname)
  if (parsed.success) writeStorage(KEY, parsed.data)
}
