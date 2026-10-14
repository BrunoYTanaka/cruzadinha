export const KONAMI = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
] as const

export type KonamiDetector = {
  // Devolve `true` quando a tecla completa a sequência (e reinicia).
  push: (event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>) => boolean
  reset: () => void
}

// Detector puro: guarda quantas teclas da sequência já foram digitadas. Tecla errada reinicia (e,
// se ela mesma começa a sequência, já conta como a primeira). Ignora teclas com Ctrl, Alt ou Meta.
export function createKonamiDetector(): KonamiDetector {
  let position = 0
  return {
    push: ({ key, ctrlKey, altKey, metaKey }) => {
      if (ctrlKey || altKey || metaKey) return false
      const normalized = key.toLowerCase()
      if (normalized === KONAMI[position]) {
        position += 1
      } else {
        position = normalized === KONAMI[0] ? 1 : 0
      }
      if (position === KONAMI.length) {
        position = 0
        return true
      }
      return false
    },
    reset: () => {
      position = 0
    },
  }
}
