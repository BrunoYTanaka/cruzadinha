import { tokenSchema } from '@cruzadinha/shared'
import { useEffect, useState } from 'react'

// O token dos links de e-mail vem no fragmento (`#token=...`), que não vai ao servidor nem a
// outros sites. Lê uma vez e limpa o endereço (feature 035, FR-017).
const reads = new Map<string, string | undefined>()
let pendingForget: ReturnType<typeof setTimeout> | undefined

export function readFragmentToken(path = window.location.pathname): string | undefined {
  // Uma segunda leitura da mesma tela (o StrictMode desenha duas vezes) repete a primeira, porque o
  // endereço já foi limpo.
  if (reads.has(path)) return reads.get(path)

  const match = /^#token=([^&]*)/.exec(window.location.hash)
  const parsed = tokenSchema.safeParse(match?.[1])
  const token = parsed.success ? parsed.data : undefined
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }
  reads.set(path, token)
  return token
}

// Só os testes: cada um começa sem leituras guardadas.
export function forgetFragmentTokens(): void {
  reads.clear()
}

// Esquece a leitura ao sair da tela. A desmontagem simulada do StrictMode volta a montar logo em
// seguida, então o esquecimento espera um instante e é cancelado se a tela voltar.
export function useFragmentToken(path: string): string | undefined {
  const [token] = useState(() => readFragmentToken(path))
  useEffect(() => {
    if (pendingForget) clearTimeout(pendingForget)
    return () => {
      pendingForget = setTimeout(() => reads.delete(path), 0)
    }
  }, [path])
  return token
}
