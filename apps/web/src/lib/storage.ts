export type StorageKind = 'local' | 'session'

// O armazenamento do navegador pode lançar exceção (modo privado, dados bloqueados ou limpos):
// toda leitura e escrita passa por aqui e o site funciona sem ele.
function area(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStorage(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return area(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string, kind: StorageKind = 'local'): boolean {
  try {
    const storage = area(kind)
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(key: string, kind: StorageKind = 'local'): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    // sem armazenamento, nada a remover
  }
}
