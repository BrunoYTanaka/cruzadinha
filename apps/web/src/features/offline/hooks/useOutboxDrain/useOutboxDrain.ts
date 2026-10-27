import { useEffect } from 'react'
import { useOnline } from '../../../../shared/hooks/useOnline/useOnline'
import { useServerReady } from '../../../../shared/hooks/useSlowServer/useSlowServer'
import { drainOutboxes } from '../../services/drain/drain'

// Envia o que a conta deixou pendente quando o servidor está pronto e há rede, fora do jogo e sem
// bloquear nada (feature 041, FR-009). A cruzada aberta nesta aba usa a própria fila.
export function useOutboxDrain(userId: string | null, openPuzzleId: string | null): void {
  const ready = useServerReady()
  const online = useOnline()
  useEffect(() => {
    if (userId && ready && online) void drainOutboxes(userId, { skipPuzzleId: openPuzzleId })
  }, [userId, ready, online, openPuzzleId])
}
