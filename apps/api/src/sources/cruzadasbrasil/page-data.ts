// Extrai os dados do jogo do HTML da Cruzadas Brasil (research R1). A página é do Next.js e leva
// o estado do React em literais de string de `self.__next_f.push([1,"..."])`. Nada do HTML é
// executado: os literais passam por JSON.parse e o objeto achado também.
export type PageDataResult = { ok: true; data: unknown } | { ok: false; detail: string }

const PUSH = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g
const MARKER = '"dadosJogo":'

function payloadText(html: string): string {
  let text = ''
  for (const match of html.matchAll(PUSH)) {
    try {
      const chunk: unknown = JSON.parse(match[1]!)
      if (typeof chunk === 'string') text += chunk
    } catch {
      // Um trecho que não é JSON não é do payload; os demais continuam valendo.
    }
  }
  return text
}

// Fim do objeto que começa em `start`, contando chaves fora de strings.
function objectEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (char === '\\') i++
      else if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) return i + 1
  }
  return -1
}

export function readPageData(html: string): PageDataResult {
  const text = payloadText(html)
  const marker = text.indexOf(MARKER)
  if (marker < 0) return { ok: false, detail: 'dados do jogo ausentes' }
  const start = marker + MARKER.length
  if (text[start] !== '{') return { ok: false, detail: 'dados do jogo fora do formato' }
  const end = objectEnd(text, start)
  if (end < 0) return { ok: false, detail: 'dados do jogo incompletos' }
  try {
    return { ok: true, data: JSON.parse(text.slice(start, end)) as unknown }
  } catch {
    return { ok: false, detail: 'dados do jogo não são JSON válido' }
  }
}
