import { readStorage, removeStorage, writeStorage } from '../../../shared/services/storage/storage'

const KEY = 'cruzadinha:pencil'

// Por aparelho, fora das configurações (não sincroniza com a conta). Ausente é desligado.
export function loadPencil(): boolean {
  return readStorage(KEY) === '1'
}

export function savePencil(on: boolean): void {
  if (on) writeStorage(KEY, '1')
  else removeStorage(KEY)
}
