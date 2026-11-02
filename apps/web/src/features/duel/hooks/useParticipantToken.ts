import { useEffect, useState } from 'react'
import { duelTokens } from '../services/duel-tokens'

// Lê o `#p=<token>` do link de retorno uma vez, guarda no aparelho e tira o fragmento do endereço.
// `undefined` enquanto procura; `null` quando este aparelho não tem token deste duelo.
export function useParticipantToken(linkToken: string): {
  token: string | null | undefined
  // Relê o token do aparelho (depois de aceitar o duelo, o token acabou de ser guardado).
  reload: () => void
} {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fromHash = /^#p=([A-Za-z0-9_-]+)$/.exec(window.location.hash)?.[1]
      if (fromHash) {
        await duelTokens.save(linkToken, fromHash)
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        )
      }
      const stored = await duelTokens.get(linkToken)
      if (!cancelled) setToken(stored)
    })()
    return () => {
      cancelled = true
    }
  }, [linkToken, tick])
  return { token, reload: () => setTick((value) => value + 1) }
}
