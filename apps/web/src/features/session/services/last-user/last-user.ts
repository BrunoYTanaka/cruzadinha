import { userSchema, type User } from '@cruzadinha/shared'
import {
  readStorage,
  removeStorage,
  writeStorage,
} from '../../../../shared/services/storage/storage'

// Último usuário que o servidor confirmou, só para montar a conta quando não há rede (feature 041,
// R4). Guarda id e e-mail; some no logout e quando o servidor responde sem sessão.
const KEY = 'cruzadinha:last-user'

export function readLastUser(): User | null {
  const raw = readStorage(KEY)
  if (raw === null) return null
  try {
    const parsed = userSchema.safeParse(JSON.parse(raw) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeLastUser(user: User): void {
  writeStorage(KEY, JSON.stringify(user))
}

export function clearLastUser(): void {
  removeStorage(KEY)
}
